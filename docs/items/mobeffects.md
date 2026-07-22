# 生物效果与药水（MobEffect & Potion）

生物效果有时称为状态效果或药水效果，在代码中称为 `MobEffect`，它是每个 tick 都会影响 [`LivingEntity`][livingentity] 的效果。本文说明如何使用它们、`MobEffect` 与 `Potion` 有何区别，以及如何添加自己的效果。

## 术语

- `MobEffect` 每个 tick 都会影响一个 Entity。与 [Block][block] 或 [Item][item] 一样，`MobEffect` 是注册表对象，因此必须[注册][registration]，并且是单例。
    - **即时 `MobEffect`** 是一种设计为只应用一个 tick 的特殊 `MobEffect`。原版有两种即时效果：瞬间治疗与瞬间伤害。
- `MobEffectInstance` 是 `MobEffect` 的实例，其中设置了持续时间、amplifier 及其他一些 property（见下文）。`MobEffectInstance` 与 `MobEffect` 的关系，就像 [`ItemStack`][itemstack] 与 `Item` 的关系。
- `Potion` 是 `MobEffectInstance` 的集合。原版主要将 `Potion` 用于四种 Potion Item（见下文），但也可以随意应用到任何 Item。之后该 Item 是否以及如何使用设置在其上的 `Potion`，由 Item 自身决定。
- **Potion Item** 是指设计为可设置 `Potion` 的 Item。这是非正式术语，原版 `PotionItem` 类与此概念无关（该类指“普通”药水 Item）。Minecraft 目前有四种 Potion Item：药水、喷溅药水、滞留药水与药箭；模组还可以添加更多。

## `MobEffect`

要创建自己的 `MobEffect`，扩展 `MobEffect` 类：

```java
public class MyMobEffect extends MobEffect {
    public MyMobEffect(MobEffectCategory category, int color) {
        super(category, color);
    }
    
    @Override
    public boolean applyEffectTick(ServerLevel level, LivingEntity entity, int amplifier) {
        // 在此应用你的效果逻辑。

        // 如果此方法返回 false，则当 shouldApplyEffectTickThisTick 返回 true 时，效果会立即被移除。
        return true;
    }
    
    // 效果是否应在当前 tick 应用。例如，再生效果只会在特定 tick 应用
    // 每 x 个 tick 一次，具体取决于 tick 计数和 amplifier。
    @Override
    public boolean shouldApplyEffectTickThisTick(int tickCount, int amplifier) {
        return tickCount % 2 == 0; // 将此替换为你想要的任何检查
    }
    
    // 首次将效果添加到实体时调用的实用方法。
    // 直到从实体中删除此效果的所有实例后，才会再次调用此函数。
    @Override
    public void onEffectAdded(LivingEntity entity, int amplifier) {
        super.onEffectAdded(entity, amplifier);
    }

    // 将效果添加到实体时调用的实用方法。
    // 每次将此效果添加到实体时都会调用此函数。
    @Override
    public void onEffectStarted(LivingEntity entity, int amplifier) {
    }
}
```

与所有注册表对象一样，`MobEffect` 必须[注册][registration]：

```java
// MOB_EFFECTS 是 DeferredRegister<MobEffect>
public static final Holder<MobEffect> MY_MOB_EFFECT = MOB_EFFECTS.register("my_mob_effect", () -> new MyMobEffect(
        //可以是 BENEFICIAL、NEUTRAL 或 HARMFUL。用于确定此效果的药水工具提示颜色。
        MobEffectCategory.BENEFICIAL,
        //RGB 格式的效果粒子的颜色。
        0xffffff
));
```

`MobEffect` 类还提供了默认功能，用于向受影响 Entity 添加 [attribute modifier][attributemodifier]，并在效果到期或通过其他方式移除时删除这些 modifier。例如，速度效果会为移动速度添加 attribute modifier。`MobEffect` 的 attribute modifier 可按如下方式添加：

```java
public static final Holder<MobEffect> MY_MOB_EFFECT = MOB_EFFECTS.register("my_mob_effect", () -> new MyMobEffect(...)
        .addAttributeModifier(Attributes.ATTACK_DAMAGE, Identifier.fromNamespaceAndPath("examplemod", "effect.strength"), 2.0, AttributeModifier.Operation.ADD_VALUE)
);
```

### `InstantenousMobEffect`

如果想创建即时效果，可以使用辅助类 `InstantenousMobEffect`，而不是常规 `MobEffect` 类：

```java
public class MyMobEffect extends InstantenousMobEffect {
    public MyMobEffect(MobEffectCategory category, int color) {
        super(category, color);
    }

    @Override
    public void applyEffectTick(ServerLevel level, LivingEntity entity, int amplifier) {
        // 在此应用你的效果逻辑。
    }
}
```

然后像平常一样[注册][registration]效果。

### 事件

许多效果会在其他位置应用其逻辑。例如，飘浮效果在 LivingEntity 的移动处理逻辑中应用。对于模组提供的 `MobEffect`，通常适合在 [事件处理器][events] 中应用它们。NeoForge 还提供了一些与效果相关的事件：

- 游戏检查是否可将 `MobEffectInstance` 应用到某个 Entity 时，触发 `MobEffectEvent.Applicable`。此事件可用于拒绝或强制向目标添加效果实例。
- 向目标添加 `MobEffectInstance` 时，触发 `MobEffectEvent.Added`。此事件包含目标上先前可能存在的 `MobEffectInstance` 的信息。
- `MobEffectInstance` 到期（即计时器归零）时，触发 `MobEffectEvent.Expired`。
- 通过到期以外的方式（例如喝牛奶或使用命令）从 Entity 移除效果时，触发 `MobEffectEvent.Remove`。

## `MobEffectInstance`

简单来说，`MobEffectInstance` 是应用到 Entity 的效果。通过调用构造器创建 `MobEffectInstance`：

```java
MobEffectInstance instance = new MobEffectInstance(
        // 要使用的生物效果。
        MobEffects.REGENERATION,
        // 使用的持续时间（以 tick 为单位）。如果未指定，则默认为 0。
        500,
        // 要使用的放大器。这是效果的"strength"，即强度 I、强度 II 等
        // 必须介于 0 到 255（含）之间。如果未指定，则默认为 0。
        0,
        // 该效果是否是 "ambient" 效果，表示它由环境源应用，
        // Minecraft 当前的此类来源包括信标和潮涌核心。如果未指定，则默认为 false。
        false,
        // 效果在物品栏中是否可见。如果未指定，则默认为 true。
        true,
        // 右上角是否可见效果图标。如果未指定，则默认为 true。
        true
);
```

有多个构造器重载可用，分别省略最后 1–5 个参数。

:::info
`MobEffectInstance` 是可变的。如果需要副本，请调用 `new MobEffectInstance(oldInstance)`。
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
`MobEffect` 只能应用于 `LivingEntity` 或其子类，即玩家与 Mob。Item 或投掷出的雪球等对象不受 `MobEffect` 影响。
:::

## `Potion`

创建 `Potion` 时，调用 `Potion` 的构造器并传入希望 `Potion` 拥有的 `MobEffectInstance`。例如：

```java
//POTIONS 是 DeferredRegister<Potion>
public static final Holder<Potion> MY_POTION = POTIONS.register("my_potion", registryName -> new Potion(
    // 药水的后缀
    registryName.getPath(),
    // 药水使用的效果
    new MobEffectInstance(MY_MOB_EFFECT, 3600)
));
```

`Potion` 的名称是第一个构造器参数。它用作翻译键的后缀；例如，原版中的延长型与增强型药水变体使用它来获得与基础变体相同的名称。

`new Potion` 的 `MobEffectInstance` 参数是可变参数。这意味着可以向 `Potion` 添加任意数量的效果，也意味着可以创建空 `Potion`，即没有任何效果的 `Potion`。只需调用 `new Potion()` 即可！（顺便一提，原版正是这样添加 `awkward` Potion 的。）

`PotionContents` 类提供了多种与 Potion Item 相关的辅助方法。Potion Item 通过 `DataComponent#POTION_CONTENTS` 存储其 `PotionContents`。

### 酿造

现在已经添加了 `Potion`，Potion Item 也可以使用你的 `Potion`。然而，在生存模式下还没有获得它的方法，下面来解决这个问题。

传统上，`Potion` 在酿造台中制作。遗憾的是，Mojang 没有为酿造配方提供[数据包][datapack]支持，因此必须稍微采用传统方式，通过 `RegisterBrewingRecipesEvent` 事件用代码添加配方。具体如下：

```java
@SubscribeEvent // 位于游戏事件总线上
public static void registerBrewingRecipes(RegisterBrewingRecipesEvent event) {
    // 获取 builder 添加配方
    PotionBrewing.Builder builder = event.getBuilder();

    // 将为所有容器potions添加酿造配方（例如药水、飞溅药水、滞留药水）
    builder.addMix(
        // 初始药水适用
        Potions.AWKWARD,
        // 酿造原料。这是酿造台顶部的物品。
        Items.FEATHER,
        // 所得药水
        MY_POTION
    );
}
```

[attributemodifier]: ../entities/attributes.md#attribute-modifiers
[block]: ../blocks/index.md
[commonsetup]: ../concepts/events.md#事件总线
[datapack]: ../resources/index.md#data
[events]: ../concepts/events.md
[item]: index.md
[itemstack]: index.md#itemstacks
[livingentity]: ../entities/livingentity.md
[registration]: ../concepts/registries.md#methods-for-registering
[uuidgen]: https://www.uuidgenerator.net/version4
