# MobEffect 与 Potion

状态效果有时称为药水效果，在代码中称为 `MobEffect`，它是每个 tick 都会影响 [`LivingEntity`][livingentity] 的效果。本文说明如何使用它们、Effect 与 Potion 有何区别，以及如何添加自己的效果。

## 术语

- `MobEffect` 每个 tick 都会影响一个 Entity。与 [Block][block] 或 [Item][item] 一样，`MobEffect` 是 registry 对象，因此必须[注册][registration]，并且是单例。
    - **即时 MobEffect**是一种设计为只应用一个 tick 的特殊 MobEffect。Vanilla 有两种即时效果：瞬间治疗与瞬间伤害。
- `MobEffectInstance` 是 `MobEffect` 的实例，其中设置了持续时间、amplifier 及其他一些 property（见下文）。`MobEffectInstance` 与 `MobEffect` 的关系，就像 [`ItemStack`][itemstack] 与 `Item` 的关系。
- `Potion` 是 `MobEffectInstance` 的集合。Vanilla 主要将 Potion 用于四种药水 Item（见下文），但也可以随意应用到任何 Item。之后该 Item 是否以及如何使用设置在其上的 Potion，由 Item 自身决定。
- **Potion Item**是指设计为可设置 Potion 的 Item。这是非正式术语，Vanilla `PotionItem` class 与此概念无关（该 class 指“普通”药水 Item）。Minecraft 目前有四种 Potion Item：药水、喷溅药水、滞留药水与药箭；模组还可以添加更多。

## `MobEffect`

要创建自己的 `MobEffect`，扩展 `MobEffect` class：

```java
public class MyMobEffect extends MobEffect {
    public MyMobEffect(MobEffectCategory category, int color) {
        super(category, color);
    }
    
    @Override
    public boolean applyEffectTick(ServerLevel level, LivingEntity entity, int amplifier) {
        // Apply your effect logic here.

        // If this returns false when shouldApplyEffectTickThisTick returns true, the effect will immediately be removed
        return true;
    }
    
    // Whether the effect should apply this tick. Used e.g. by the Regeneration effect that only applies
    // once every x ticks, depending on the tick count and amplifier.
    @Override
    public boolean shouldApplyEffectTickThisTick(int tickCount, int amplifier) {
        return tickCount % 2 == 0; // replace this with whatever check you want
    }
    
    // Utility method that is called when the effect is first added to the entity.
    // This does not get called again until all instances of this effect have been removed from the entity.
    @Override
    public void onEffectAdded(LivingEntity entity, int amplifier) {
        super.onEffectAdded(entity, amplifier);
    }

    // Utility method that is called when the effect is added to the entity.
    // This gets called every time this effect is added to the entity.
    @Override
    public void onEffectStarted(LivingEntity entity, int amplifier) {
    }
}
```

与所有 registry 对象一样，`MobEffect` 必须[注册][registration]：

```java
// MOB_EFFECTS is a DeferredRegister<MobEffect>
public static final Holder<MobEffect> MY_MOB_EFFECT = MOB_EFFECTS.register("my_mob_effect", () -> new MyMobEffect(
        //Can be either BENEFICIAL, NEUTRAL or HARMFUL. Used to determine the potion tooltip color of this effect.
        MobEffectCategory.BENEFICIAL,
        //The color of the effect particles in RGB format.
        0xffffff
));
```

`MobEffect` class 还提供了默认功能，用于向受影响 Entity 添加 [attribute modifier][attributemodifier]，并在效果到期或通过其他方式移除时删除这些 modifier。例如，速度效果会为移动速度添加 attribute modifier。Effect attribute modifier 可按如下方式添加：

```java
public static final Holder<MobEffect> MY_MOB_EFFECT = MOB_EFFECTS.register("my_mob_effect", () -> new MyMobEffect(...)
        .addAttributeModifier(Attributes.ATTACK_DAMAGE, Identifier.fromNamespaceAndPath("examplemod", "effect.strength"), 2.0, AttributeModifier.Operation.ADD_VALUE)
);
```

### `InstantenousMobEffect`

如果想创建即时效果，可以使用辅助 class `InstantenousMobEffect`，而不是常规 `MobEffect` class：

```java
public class MyMobEffect extends InstantenousMobEffect {
    public MyMobEffect(MobEffectCategory category, int color) {
        super(category, color);
    }

    @Override
    public void applyEffectTick(ServerLevel level, LivingEntity entity, int amplifier) {
        // Apply your effect logic here.
    }
}
```

然后像平常一样[注册][registration]效果。

### Event

许多效果会在其他位置应用其逻辑。例如，飘浮效果在 LivingEntity 移动 handler 中应用。对于模组提供的 `MobEffect`，通常适合在 [Event handler][events] 中应用它们。NeoForge 还提供了一些与效果相关的 Event：

- 游戏检查是否可将 `MobEffectInstance` 应用到某个 Entity 时，触发 `MobEffectEvent.Applicable`。此 Event 可用于拒绝或强制向目标添加效果实例。
- 向目标添加 `MobEffectInstance` 时，触发 `MobEffectEvent.Added`。此 Event 包含目标上先前可能存在的 `MobEffectInstance` 的信息。
- `MobEffectInstance` 到期（即计时器归零）时，触发 `MobEffectEvent.Expired`。
- 通过到期以外的方式（例如喝牛奶或使用命令）从 Entity 移除效果时，触发 `MobEffectEvent.Remove`。

## `MobEffectInstance`

简单来说，`MobEffectInstance` 是应用到 Entity 的效果。通过调用 constructor 创建 `MobEffectInstance`：

```java
MobEffectInstance instance = new MobEffectInstance(
        // The mob effect to use.
        MobEffects.REGENERATION,
        // The duration to use, in ticks. Defaults to 0 if not specified.
        500,
        // The amplifier to use. This is the "strength" of the effect, i.e. Strength I, Strength II, etc.
        // Must be between 0 and 255 (inclusive). Defaults to 0 if not specified.
        0,
        // Whether the effect is an "ambient" effect, meaning it is being applied by an ambient source,
        // of which Minecraft currently has the beacon and the conduit. Defaults to false if not specified.
        false,
        // Whether the effect is visible in the inventory. Defaults to true if not specified.
        true,
        // Whether an effect icon is visible in the top right corner. Defaults to true if not specified.
        true
);
```

有多个 constructor overload 可用，分别省略最后 1–5 个参数。

:::info
`MobEffectInstance` 是 mutable 的。如果需要副本，请调用 `new MobEffectInstance(oldInstance)`。
:::

### 使用 `MobEffectInstance`

可按如下方式向 `LivingEntity` 添加 `MobEffectInstance`：

```java
MobEffectInstance instance = new MobEffectInstance(...);
livingEntity.addEffect(instance);
```

同样，也可以从 `LivingEntity` 移除 `MobEffectInstance`。由于 `MobEffectInstance` 会覆盖该 Entity 上同一 `MobEffect` 先前已有的 `MobEffectInstance`，每个 Entity 对每个 `MobEffect` 始终只能有一个 `MobEffectInstance`。因此，移除时指定 `MobEffect` 即可：

```java
livingEntity.removeEffect(MobEffects.REGENERATION);
```

:::info
`MobEffect` 只能应用于 `LivingEntity` 或其 subclass，即玩家与 Mob。Item 或投掷出的雪球等对象不受 `MobEffect` 影响。
:::

## `Potion`

创建 `Potion` 时，调用 `Potion` 的 constructor 并传入希望 Potion 拥有的 `MobEffectInstance`。例如：

```java
//POTIONS is a DeferredRegister<Potion>
public static final Holder<Potion> MY_POTION = POTIONS.register("my_potion", registryName -> new Potion(
    // The suffix applied to the potion
    registryName.getPath(),
    // The effects used by the potion
    new MobEffectInstance(MY_MOB_EFFECT, 3600)
));
```

Potion 的名称是第一个 constructor 参数。它用作 translation key 的后缀；例如，Vanilla 中的延长型与增强型药水变体使用它来获得与基础变体相同的名称。

`new Potion` 的 `MobEffectInstance` 参数是 vararg。这意味着可以向 Potion 添加任意数量的效果，也意味着可以创建空 Potion，即没有任何效果的 Potion。只需调用 `new Potion()` 即可！（顺便一提，Vanilla 正是这样添加 `awkward` Potion 的。）

`PotionContents` class 提供了多种与 Potion Item 相关的辅助方法。Potion Item 通过 `DataComponent#POTION_CONTENTS` 存储其 `PotionContents`。

### 酿造

现在已经添加了 Potion，Potion Item 也可以使用你的 Potion。然而，在生存模式下还没有获得它的方法，下面来解决这个问题。

传统上，Potion 在 Brewing Stand 中制作。遗憾的是，Mojang 没有为酿造配方提供 [datapack][datapack] 支持，因此必须稍微采用传统方式，通过 `RegisterBrewingRecipesEvent` Event 用代码添加配方。具体如下：

```java
@SubscribeEvent // on the game event bus
public static void registerBrewingRecipes(RegisterBrewingRecipesEvent event) {
    // Gets the builder to add recipes to
    PotionBrewing.Builder builder = event.getBuilder();

    // Will add brewing recipes for all container potions (e.g. potion, splash potion, lingering potion)
    builder.addMix(
        // The initial potion to apply to
        Potions.AWKWARD,
        // The brewing ingredient. This is the item at the top of the brewing stand.
        Items.FEATHER,
        // The resulting potion
        MY_POTION
    );
}
```

[attributemodifier]: ../entities/attributes.md#attribute-modifiers
[block]: ../blocks/index.md
[commonsetup]: ../concepts/events.md#event-buses
[datapack]: ../resources/index.md#data
[events]: ../concepts/events.md
[item]: index.md
[itemstack]: index.md#itemstacks
[livingentity]: ../entities/livingentity.md
[registration]: ../concepts/registries.md#methods-for-registering
[uuidgen]: https://www.uuidgenerator.net/version4
