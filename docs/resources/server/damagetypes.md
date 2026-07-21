# 伤害类型、伤害来源（Damage Types & Damage Sources）

Damage Type 表示正在对[实体][entity]施加何种伤害——例如物理伤害、火焰伤害、溺水伤害、魔法伤害、虚空伤害等。对 Damage Type 的区分可用于各种免疫机制（例如烈焰人不会受到火焰伤害）、附魔（例如爆炸保护只抵御爆炸伤害），以及许多其他场景。

可以说，Damage Type 是 Damage Source 的模板。换句话说，可以把 Damage Source 看作 Damage Type 的实例。Damage Type 在代码中以 [`ResourceKey`][rk] 的形式存在，但其全部属性都在数据包中定义。另一方面，Damage Source 会由游戏根据数据包文件中的值按需创建，并且可以携带额外的上下文，例如发起攻击的 Entity。

## 创建 Damage Type

首先，需要创建自己的 `DamageType`。`DamageType` 属于[数据包 Registry][dr]，因此新的 `DamageType` 不在代码中注册，而会在添加相应文件时自动注册。不过，我们仍需要为代码提供一个获取 Damage Source 的入口。为此，需要指定一个[资源键][rk]：

```java
public static final ResourceKey<DamageType> EXAMPLE_DAMAGE =
        ResourceKey.create(Registries.DAMAGE_TYPE, Identifier.fromNamespaceAndPath(ExampleMod.MOD_ID, "example"));
```

现在，我们已经可以从代码中引用它，接下来在数据文件里指定一些属性。数据文件位于 `data/examplemod/damage_type/example.json`（请将 `examplemod` 和 `example` 分别替换为 mod id 与资源位置名称），内容如下：

```json5
{
    // The death message id of the damage type. The full death message translation key will be
    // "death.attack.examplemod.example" (with swapped-out mod id and name).
    "message_id": "examplemod.example",
    // Whether this damage type's damage amount scales with difficulty or not. Valid vanilla values are:
    // - "never": The damage value remains the same on any difficulty. Common for player-caused damage types.
    // - "when_caused_by_living_non_player": The damage value is scaled if the entity is caused by a
    //   living entity of some sort, including indirectly (e.g. an arrow shot by a skeleton), that is not a player.
    // - "always": The damage value is always scaled. Commonly used by explosion-like damage.
    "scaling": "when_caused_by_living_non_player",
    // The amount of exhaustion caused by receiving this kind of damage.
    "exhaustion": 0.1,
    // The damage effects (currently only sound effects) that are applied when receiving this kind of damage. Optional.
    // Valid vanilla values are "hurt" (default), "thorns", "drowning", "burning", "poking", and "freezing".
    "effects": "hurt",
    // The death message type. Determines how the death message is built. Optional.
    // Valid vanilla values are "default" (default), "fall_variants", and "intentional_game_design".
    "death_message_type": "default"
}
```

:::tip
`scaling`、`effects` 和 `death_message_type` 字段在内部依次由 `DamageScaling`、`DamageEffects` 和 `DeathMessageType` 枚举控制。如有需要，可以[扩展][extenum]这些枚举以添加自定义值。
:::

原版 Damage Type 也使用相同格式，数据包开发者可以按需更改这些值。
 
## 创建和使用 Damage Source

`DamageSource` 通常会在调用 [`Entity#hurt`][entityhurt] 时即时创建。请注意，由于 Damage Type 属于[数据包 Registry][dr]，因此需要通过 `RegistryAccess` 查询它们；`RegistryAccess` 可通过 `Level#registryAccess` 获取。要创建 `DamageSource`，请调用 `DamageSource` 构造器，它最多接受四个参数：

```java
DamageSource damageSource = new DamageSource(
        // The damage type holder to use. Query from the registry. This is the only required parameter.
        registryAccess.lookupOrThrow(Registries.DAMAGE_TYPE).getOrThrow(EXAMPLE_DAMAGE),
        // The direct entity. For example, if a skeleton shot you, the skeleton would be the causing entity
        // (= the parameter above), and the arrow would be the direct entity (= this parameter). Similar to
        // the causing entity, this isn't always applicable and therefore nullable. Optional, defaults to null.
        null,
        // The entity causing the damage. This isn't always applicable (e.g. when falling out of the world)
        // and may therefore be null. Optional, defaults to null.
        null,
        // The damage source position. This is rarely used, one example would be intentional game design
        // (= nether beds exploding). Nullable and optional, defaulting to null.
        null
);
```

:::warning
`DamageSources#source` 是对 `new DamageSource` 的包装，但它会交换第二和第三个参数（直接 Entity 与致因 Entity）的位置。请确保向每个参数传入正确的值。
:::

如果 `DamageSource` 完全不包含 Entity 或位置上下文，可以将其缓存在字段中。对于确实包含 Entity 或位置上下文的 `DamageSource`，通常会像下面这样添加辅助方法：

```java
public static DamageSource exampleDamage(Entity causer) {
    return new DamageSource(
            causer.level().registryAccess().lookupOrThrow(Registries.DAMAGE_TYPE).getOrThrow(EXAMPLE_DAMAGE),
            causer);
}
```

:::tip
原版的 `DamageSource` 工厂位于 `DamageSources` 中，原版的 `DamageType` 资源键位于 `DamageTypes` 中。Entity 还提供了 `Entity#damageSources` 方法，用于便捷地获取 `DamageSources` 实例。
:::

Damage Source 最主要的用途是 `Entity#hurt`。每当 Entity 受到伤害时都会调用该方法。要使用自定义 Damage Type 伤害某个 Entity，只需自行调用 `Entity#hurt`：

```java
// The second parameter is the amount of damage, in half hearts.
entity.hurt(exampleDamage(player), 10);
```

其他特定于 Damage Type 的行为（例如无敌检查）通常通过 Damage Type [标签][tags]实现。这些标签由 Minecraft 与 NeoForge 添加，分别可在 `DamageTypeTags` 和 `Tags.DamageTypes` 中找到。

## 数据生成

_更多信息请参阅[数据包 Registry 的数据生成][drdatagen]。_

Damage Type JSON 文件可以通过[数据生成][datagen]创建。由于 Damage Type 属于数据包 Registry，因此我们通过 `GatherDataEvent#createDatapackRegistryObjects` 添加 `DatapackBuiltinEntriesProvider`，并将自己的 Damage Type 放入 `RegistrySetBuilder`：

```java
// In your datagen class
@SubscribeEvent // on the mod event bus
public static void onGatherData(GatherDataEvent.Client event) {
    event.createDatapackRegistryObjects(new RegistrySetBuilder()
        // Add a datapack builtin entry provider for damage types. If this lambda becomes longer,
        // this should probably be extracted into a separate method for the sake of readability.
        .add(Registries.DAMAGE_TYPE, bootstrap -> {
            // Use new DamageType() to create an in-code representation of a damage type.
            // The parameters map to the values of the JSON file, in the order seen above.
            // All parameters except for the message id and the exhaustion value are optional.
            bootstrap.register(EXAMPLE_DAMAGE, new DamageType(EXAMPLE_DAMAGE.identifier(),
                DamageScaling.WHEN_CAUSED_BY_LIVING_NON_PLAYER,
                0.1f,
                DamageEffects.HURT,
                DeathMessageType.DEFAULT)
            )
        })
        // Add datapack providers for other datapack entries, if applicable.
        .add(...)
    );

    // ...
}
```

[datagen]: ../index.md#data-generation
[dr]: ../../concepts/registries.md#datapack-registries
[drdatagen]: ../../concepts/registries.md#data-generation-for-datapack-registries
[entity]: ../../entities/index.md
[entityhurt]: ../../entities/index.md#damaging-entities
[extenum]: ../../advanced/extensibleenums.md
[rk]: ../../misc/identifier.md#resourcekeys
[tags]: tags.md
