# 伤害类型、伤害来源（Damage Types & Damage Sources）

伤害类型表示正在对[实体][entity]施加何种伤害——例如物理伤害、火焰伤害、溺水伤害、魔法伤害、虚空伤害等。对伤害类型的区分可用于各种免疫机制（例如烈焰人不会受到火焰伤害）、附魔（例如爆炸保护只抵御爆炸伤害），以及许多其他场景。

可以说，伤害类型是伤害来源的模板。换句话说，可以把伤害来源看作伤害类型的实例。伤害类型在代码中以 [`ResourceKey`][rk] 的形式存在，但其全部属性都在数据包中定义。另一方面，伤害来源会由游戏根据数据包文件中的值按需创建，并且可以携带额外的上下文，例如发起攻击的 Entity。

## 创建伤害类型

首先，需要创建自己的 `DamageType`。`DamageType` 属于[数据包 Registry][dr]，因此新的 `DamageType` 不在代码中注册，而会在添加相应文件时自动注册。不过，我们仍需要为代码提供一个获取伤害来源的入口。为此，需要指定一个[资源键][rk]：

```java
public static final ResourceKey<DamageType> EXAMPLE_DAMAGE =
        ResourceKey.create(Registries.DAMAGE_TYPE, Identifier.fromNamespaceAndPath(ExampleMod.MOD_ID, "example"));
```

现在，我们已经可以从代码中引用它，接下来在数据文件里指定一些属性。数据文件位于 `data/examplemod/damage_type/example.json`（请将 `examplemod` 和 `example` 分别替换为 mod id 与资源位置名称），内容如下：

```json5
{
    // 伤害类型的死亡消息ID。完整的死亡消息翻译键将是
    // "death.attack.examplemod.example"（带有换出的模组 ID 和名称）。
    "message_id": "examplemod.example",
    // 此伤害类型的伤害量是否难以缩放。有效的原版值是：
    // - "never"：任何难度下伤害值都保持不变。常见于玩家造成的伤害类型。
    // - "when_caused_by_living_non_player"：如果实体是由以下原因造成的，则伤害值会按比例缩放：
    //   某种非玩家生物实体，包括间接来源（例如骷髅射出的箭）。
    // - "always"：伤害值始终按比例缩放，常用于爆炸类伤害。
    "scaling": "when_caused_by_living_non_player",
    // 受到此类伤害时产生的饥饿消耗量。
    "exhaustion": 0.1,
    // 受到此类伤害时施加的伤害 effects（当前仅声音效果）。 可选。
    // 有效的原版值为 "hurt"（默认）、"thorns"、"drowning"、"burning"、"poking" 和 "freezing"。
    "effects": "hurt",
    // 死亡消息类型。确定如何构建死亡消息。 可选。
    // 有效的原版值为 "default"（默认）、"fall_variants" 和 "intentional_game_design"。
    "death_message_type": "default"
}
```

:::tip
`scaling`、`effects` 和 `death_message_type` 字段在内部依次由 `DamageScaling`、`DamageEffects` 和 `DeathMessageType` 枚举控制。如有需要，可以[扩展][extenum]这些枚举以添加自定义值。
:::

原版伤害类型也使用相同格式，数据包开发者可以按需更改这些值。
 
## 创建和使用伤害来源

`DamageSource` 通常会在调用 [`Entity#hurt`][entityhurt] 时即时创建。请注意，由于伤害类型属于[数据包 Registry][dr]，因此需要通过 `RegistryAccess` 查询它们；`RegistryAccess` 可通过 `Level#registryAccess` 获取。要创建 `DamageSource`，请调用 `DamageSource` 构造器，它最多接受四个参数：

```java
DamageSource damageSource = new DamageSource(
        // 要使用的伤害类型 Holder。请从注册表查询；这是唯一的必填参数。
        registryAccess.lookupOrThrow(Registries.DAMAGE_TYPE).getOrThrow(EXAMPLE_DAMAGE),
        // 直接实体。例如，如果骷髅朝你开枪，那么骷髅就是造成事件的实体
        // （=上面的参数），箭头将是直接的实体（=此参数）。类似于
        // 导致实体此并不总是适用，因此可为空。 可选，默认为null。
        null,
        // 造成伤害的实体。该值并非始终适用（例如掉出世界时）
        // ，因此可能是 null。 可选，默认为null。
        null,
        // 伤害源位置。这很少使用，一个例子是有意的游戏设计
        // （=下层床爆炸）。可空且可选，默认为 null。
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

伤害来源最主要的用途是 `Entity#hurt`。每当 Entity 受到伤害时都会调用该方法。要使用自定义伤害类型伤害某个 Entity，只需自行调用 `Entity#hurt`：

```java
// 第二个参数是伤害量，以半颗心为单位。
entity.hurt(exampleDamage(player), 10);
```

其他特定于伤害类型的行为（例如无敌检查）通常通过伤害类型 [标签][tags]实现。这些标签由 Minecraft 与 NeoForge 添加，分别可在 `DamageTypeTags` 和 `Tags.DamageTypes` 中找到。

## 数据生成

_更多信息请参阅[数据包 Registry 的数据生成][drdatagen]。_

伤害类型 JSON 文件可以通过[数据生成][datagen]创建。由于伤害类型属于数据包 Registry，因此我们通过 `GatherDataEvent#createDatapackRegistryObjects` 添加 `DatapackBuiltinEntriesProvider`，并将自己的伤害类型放入 `RegistrySetBuilder`：

```java
// 在你的 datagen 类中
@SubscribeEvent // 位于模组事件总线上
public static void onGatherData(GatherDataEvent.Client event) {
    event.createDatapackRegistryObjects(new RegistrySetBuilder()
        // 为伤害类型添加数据包内置条目提供器。如果此 Lambda 表达式变得更长，
        // 此可能应该被提取到一个单独的方法中。
        .add(Registries.DAMAGE_TYPE, bootstrap -> {
            // 使用 new DamageType() 创建伤害类型在代码中的表示。
            // 这些参数按照上面所示的顺序映射到 JSON 文件的值。
            // 除了消息ID和耗尽值之外的所有参数都是可选的。
            bootstrap.register(EXAMPLE_DAMAGE, new DamageType(EXAMPLE_DAMAGE.identifier(),
                DamageScaling.WHEN_CAUSED_BY_LIVING_NON_PLAYER,
                0.1f,
                DamageEffects.HURT,
                DeathMessageType.DEFAULT)
            )
        })
        // 添加其他数据包条目的数据包提供器（如果适用）。
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
