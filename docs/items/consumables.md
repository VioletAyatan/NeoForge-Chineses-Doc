# 消耗品（Consumables）

消耗品是可在一段时间内使用、并在此过程中被“消耗”的 [Item][item]。Minecraft 中所有可食用或饮用的内容，都属于某种消耗品。

## `Consumable` 数据组件

任何可消耗 Item 都具有 [`DataComponents#CONSUMABLE` 组件][datacomponent]。其底层 record `Consumable` 定义 Item 如何被消耗，以及消耗后应用哪些效果。

可以直接调用 record 构造器创建 `Consumable`，也可以通过 `Consumable#builder` 创建；后者会为每个字段设置默认值，完成后再调用 `build`：

- `consumeSeconds`——表示完全消耗 Item 所需秒数的 `float`。经过指定时间后调用 `Item#finishUsingItem`。默认为 1.6 秒，即 32 tick。
- `animation`——设置使用 Item 时播放的 [`ItemUseAnimation`][animation]。默认为 `ItemUseAnimation#EAT`。
- `sound`——设置消耗 Item 期间播放的 [`SoundEvent`][sound]。它必须是 `Holder` 实例。默认为 `SoundEvents#GENERIC_EAT`。
    - 如果某个原版实例不是 `Holder<SoundEvent>`，可以调用 `BuiltInRegistries.SOUND_EVENT.wrapAsHolder(soundEvent)` 获取由 `Holder` 封装的版本。
- `soundAfterConsume`——设置 Item 完成消耗后播放的 [`SoundEvent`][sound]。它会委托给 [`PlaySoundConsumeEffect`][consumeeffect]。
- `hasConsumeParticles`——为 `true` 时，每四个 tick 以及 Item 完全消耗时生成 Item [粒子][particles]。默认为 `true`。
- `onConsume`——添加一个 [`ConsumeEffect`][consumeeffect]，在 Item 通过 `Item#finishUsingItem` 完全消耗后应用。

原版在 `Consumables` 类中提供了一些消耗品，例如用于[食物][food] Item 的 `#defaultFood`，以及用于[药水][potions]和奶桶的 `#defaultDrink`。

可以调用 `Item.Properties#component` 添加 `Consumable` 组件：

```java
// 假设有一些 DeferredRegister.Items ITEMS
public static final DeferredItem<Item> CONSUMABLE = ITEMS.registerSimpleItem(
    "consumable",
    props -> props.component(
        DataComponents.CONSUMABLE,
        Consumable.builder()
            // 花费 2 秒，即 40 tick 来完成消耗
            .consumeSeconds(2f)
            // 设置消耗期间播放的动画
            .animation(ItemUseAnimation.BLOCK)
            // 消耗期间每个 tick 都播放声音
            .sound(SoundEvents.ARMOR_EQUIP_CHAIN)
            // 消耗完成后播放声音
            .soundAfterConsume(SoundEvents.BREEZE_WIND_CHARGE_BURST)
            // 进食时不显示粒子
            .hasConsumeParticles(false)
            .onConsume(
                // 消耗完毕后，有30%的几率施加效果
                new ApplyStatusEffectsConsumeEffect(new MobEffectInstance(MobEffects.HUNGER, 600, 0), 0.3F)
            )
            // 可以有多个
            .onConsume(
                // 在 50 格半径内随机传送实体
                new TeleportRandomlyConsumeEffect(100f)
            )
            .build()
    )
);
```

### `ConsumeEffect`

消耗品使用完成后，你可能希望触发某种逻辑，例如添加状态效果。这由 `ConsumeEffect` 处理；通过调用 `Consumable.Builder#onConsume` 将其添加到 `Consumable`。

原版效果列表可在 `ConsumeEffect` 中找到。

每个 `ConsumeEffect` 都有两个方法：`getType` 指定注册表对象 `ConsumeEffect.Type`；`apply` 在 Item 完全消耗后调用。`apply` 接受三个参数：执行消耗的 Entity 所在的 `Level`、调用消耗行为的 `ItemStack`，以及正在消耗该对象的 `LivingEntity`。效果成功应用时，方法返回 `true`；失败时返回 `false`。

可通过实现该接口来创建 `ConsumeEffect`，并将带有关联 `MapCodec` 与 `StreamCodec` 的 `ConsumeEffect.Type` [注册][registering]到 `BuiltInRegistries#CONSUME_EFFECT_TYPE`：

```java
public record UsePortalConsumeEffect(ResourceKey<Level> level)
    implements ConsumeEffect, Portal {

    @Override
    public boolean apply(Level level, ItemStack stack, LivingEntity entity) {
        if (entity.canUsePortal(false)) {
            entity.setAsInsidePortal(this, entity.blockPosition());

            // 可以成功使用传送门
            return true;
        }

        // 无法使用传送门
        return false;
    }

    @Override
    public ConsumeEffect.Type<? extends ConsumeEffect> getType() {
        // 设置为注册对象
        return USE_PORTAL.get();
    }

    @Override
    @Nullable
    public TeleportTransition getPortalDestination(ServerLevel level, Entity entity, BlockPos pos) {
        // 设置传送位置
    }
}

// 在某个注册类中
// 假设有一些 DeferredRegister<ConsumeEffect.Type<?>> CONSUME_EFFECT_TYPES
public static final Supplier<ConsumeEffect.Type<UsePortalConsumeEffect>> USE_PORTAL =
    CONSUME_EFFECT_TYPES.register("use_portal", () -> new ConsumeEffect.Type<>(
        ResourceKey.codec(Registries.DIMENSION).optionalFieldOf("dimension")
            .xmap(UsePortalConsumeEffect::new, UsePortalConsumeEffect::level),
        ResourceKey.streamCodec(Registries.DIMENSION)
            .map(UsePortalConsumeEffect::new, UsePortalConsumeEffect::level)
    ));

// 对于某个正在添加 CONSUMABLE 组件的 Item.Properties
Consumable.builder()
    .onConsume(
        new UsePortalConsumeEffect(Level.END)
    )
    .build();
```

### `ItemUseAnimation`

`ItemUseAnimation` 在功能上相当于一个除 ID 与名称之外不定义任何内容的枚举。第一人称下，其用途硬编码在 `ItemHandRenderer#renderArmWithItem` 中；第三人称下则硬编码在 `AvatarRenderer#getArmPose` 中。因此，仅创建新的 `ItemUseAnimation` 只会产生类似 `ItemUseAnimation#NONE` 的效果。

要应用某种动画，需要为第一人称实现 `IClientItemExtensions#applyForgeHandTransform`，和／或为第三人称渲染实现 `IClientItemExtensions#getArmPose`。

#### 创建 `ItemUseAnimation`

首先创建新的 `ItemUseAnimation`。这通过[可扩展枚举][extensibleenum] 系统完成：

```json5
{
    "entries": [
        {
            "enum": "net/minecraft/world/item/ItemUseAnimation",
            "name": "EXAMPLEMOD_ITEM_USE_ANIMATION",
            "constructor": "(ILjava/lang/String;)V",
            "parameters": [
                // ID，应始终为 -1
                -1,
                // 名称，应该是唯一标识符
                "examplemod:item_use_animation"
            ]
        }
    ]
}
```

然后可以通过 `valueOf` 获取枚举常量：

```java
public static final ItemUseAnimation EXAMPLE_ANIMATION = ItemUseAnimation.valueOf("EXAMPLEMOD_ITEM_USE_ANIMATION");
```

接下来即可开始应用变换。为此，必须创建新的 `IClientItemExtensions`、实现所需方法，并通过 [**模组事件总线**][modbus] 上的 `RegisterClientExtensionsEvent` 注册它：

```java
public class ConsumableClientItemExtensions implements IClientItemExtensions {
    // 此处实现方法
}

// 在某些事件处理器类中
@SubscribeEvent // 仅在物理客户端上的模组事件总线上
public static void registerClientExtensions(RegisterClientExtensionsEvent event) {
    event.registerItem(
        // 物品扩展的实例
        new ConsumableClientItemExtensions(),
        // 使用其物品的可变参数
        CONSUMABLE
    )
}
```

#### 第一人称

所有消耗品都具有的第一人称变换通过 `IClientItemExtensions#applyForgeHandTransform` 实现：

```java
public class ConsumableClientItemExtensions implements IClientItemExtensions {

    // ...

    @Override
    public boolean applyForgeHandTransform(
        PoseStack poseStack, LocalPlayer player, HumanoidArm arm, ItemStack itemInHand,
        float partialTick, float equipProcess, float swingProcess
    ) {
        // 我们首先需要检查该物品是否正在被使用并且有我们的动画
        HumanoidArm usingArm = entity.getUsedItemHand() == InteractionHand.MAIN_HAND
            ? entity.getMainArm()
            : entity.getMainArm().getOpposite();
        if (
            entity.isUsingItem() && entity.getUseItemRemainingTicks() > 0
            && usingArm == arm && itemInHand.getUseAnimation() == EXAMPLE_ANIMATION
        ) {
            // 对 pose stack 应用变换（平移、缩放、mulPose）
            // ...
            return true;
        }

        // 什么都不做
        return false;
    }
}
```

#### 第三人称

除 `EAT` 与 `DRINK` 外，所有具有特殊逻辑的消耗品，其第三人称变换都通过 `IClientItemExtensions#getArmPose` 实现；`HumanoidModel.ArmPose` 也可扩展，以提供自定义变换。

由于 `ArmPose` 的构造器中需要 Lambda 表达式，必须使用 `EnumProxy` 引用：

```json5
{
    "entries": [
        {
            "name": "EXAMPLEMOD_ITEM_USE_ANIMATION",
            // ...
        },
        {
            "enum": "net/minecraft/client/model/HumanoidModel$ArmPose",
            "name": "EXAMPLEMOD_ARM_POSE",
            "constructor": "(ZLnet/neoforged/neoforge/client/IArmPoseTransformer;)V",
            "parameters": {
                // 指向代理所在的类
                // 应该分开，因为这是仅客户端类
                "class": "example/examplemod/client/MyClientEnumParams",
                // 枚举代理的字段名称
                "field": "CUSTOM_ARM_POSE"
            }
        }
    ]
}
```

```java
// 创建枚举参数
public class MyClientEnumParams {
    public static final EnumProxy<HumanoidModel.ArmPose> CUSTOM_ARM_POSE = new EnumProxy<>(
        HumanoidModel.ArmPose.class,
        // 姿势是否使用双臂
        false,
        // 副手位置是否受模型姿态影响
        false,
        // 姿势变换器
        (IArmPoseTransformer) MyClientEnumParams::applyCustomModelPose
    );

    private static void applyCustomModelPose(
        HumanoidModel<?> model, HumanoidRenderState state, HumanoidArm arm
    ) {
        // 在此处应用模型变换
        // ...
    }
}

// 在某些仅客户端类中
public static final HumanoidModel.ArmPose EXAMPLE_POSE = HumanoidModel.ArmPose.valueOf("EXAMPLEMOD_ARM_POSE");
```

然后通过 `IClientItemExtensions#getArmPose` 设置手臂姿势：

```java
public class ConsumableClientItemExtensions implements IClientItemExtensions {

    // ...

    @Override
    public HumanoidModel.ArmPose getArmPose(
        LivingEntity entity, InteractionHand hand, ItemStack stack
    ) {
        // 我们首先需要检查该物品是否正在被使用并且有我们的动画
        if (
            entity.isUsingItem() && entity.getUseItemRemainingTicks() > 0
            && entity.getUsedItemHand() == hand
            && itemInHand.getUseAnimation() == EXAMPLE_ANIMATION
        ) {
            // 返回要应用的姿势
            return EXAMPLE_POSE;
        }

        // 否则返回 null
        return null;
    }
}
```

### 覆盖 Entity 上的声音

有时，某个 Entity 在消耗 Item 时可能需要播放不同声音。在这种情况下，[`LivingEntity`][livingentity] 实例可以实现 `Consumable.OverrideConsumeSound`，并让 `getConsumeSound` 返回希望该 Entity 播放的 `SoundEvent`。

```java
public class MyEntity extends LivingEntity implements Consumable.OverrideConsumeSound {
    
    // ...

    @Override
    public SoundEvent getConsumeSound(ItemStack stack) {
        // 返回要播放的声音
    }
}
```

## `ConsumableListener`

消耗品以及消耗后应用的效果非常有用，但有时某种效果的 property 需要作为其他 [数据组件][datacomponents] 对外提供。例如，猫和狼也会食用[食物][food]并查询其营养值，带有 Potion 内容的 Item 则会查询其颜色以进行渲染。在这些情况下，数据组件会实现 `ConsumableListener` 以提供消耗逻辑。

`ConsumableListener` 只有一个方法：`#onConsume`，它接受当前 Level、正在消耗 Item 的 Entity、被消耗的 Item，以及 Item 上的 `Consumable` 实例。Item 完全消耗后，在 `Item#finishUsingItem` 期间调用 `onConsume`。

添加自己的 `ConsumableListener` 只需[注册新的数据组件][datacompreg] 并实现 `ConsumableListener`。

```java
public record MyConsumableListener() implements ConsumableListener {

    @Override
    public void onConsume(
        Level level, LivingEntity entity, ItemStack stack, Consumable consumable
    ) {
        // 在这里做事
    }
}
```

### 食物

食物是饥饿系统中的一种 `ConsumableListener`。食物 Item 的全部功能已在 `Item` 类中处理，因此只需将 `FoodProperties` 添加到 `DataComponents#FOOD`，并同时添加消耗品即可。辅助方法 `food` 接受 `FoodProperties` 与 `Consumable` 对象；如未指定后者，则使用 `Consumables#DEFAULT_FOOD`。

可以直接调用 record 构造器创建 `FoodProperties`，也可以通过 `new FoodProperties.Builder()` 创建，并在完成后调用 `build`：

- `nutrition`——设置恢复的饥饿值。以半格饥饿值计数，因此例如 Minecraft 中的牛排恢复 8 点饥饿值。
- `saturationModifier`——计算食用该食物时恢复的[饱和度值][hunger]所用的饱和度 modifier。计算公式为 `min(2 * nutrition * saturationModifier, playerNutrition)`，因此使用 `0.5` 会使实际饱和度值与营养值相同。
- `alwaysEdible`——该 Item 是否始终可食用，即使饥饿条已满。默认为 `false`；金苹果及其他除填充饥饿条外还提供加成的 Item 为 `true`。

```java
// 假设有一些 DeferredRegister.Items ITEMS
public static final DeferredItem<Item> FOOD = ITEMS.registerSimpleItem(
    "food",
    props -> props.food(
        new FoodProperties.Builder()
            // 恢复 1.5 格饥饿值
            .nutrition(3)
            // 胡萝卜 0.3
            // 生鳕鱼为 0.1
            // 熟鸡肉为 0.6
            // 牛排为 0.8
            // 金苹果 1.2
            .saturationModifier(0.3f)
            // 设置后，即使饥饿条已满也可以食用。
            .alwaysEdible()
    )
);
```

如需示例或查看 Minecraft 使用的不同值，请查看 `Foods` 类。

要获取某个 Item 的 `FoodProperties`，调用 `ItemStack.get(DataComponents.FOOD)`。它可能返回 null，因为并非每个 Item 都可食用。要判断 Item 是否可食用，请对 `getFoodProperties` 调用结果进行 null 检查。

### 药水内容

通过 `PotionContents` 表示的[药水][potions]内容是另一种 `ConsumableListener`，其效果会在消耗时应用。它包含要应用的可选 `Potion`、`Potion` 颜色的可选着色值、与 `Potion` 一同应用的自定义 [`MobEffectInstance`][mobeffectinstance] 列表，以及获取 ItemStack 名称时使用的可选翻译键。如果 Item 不是 `PotionItem` 子类型，模组开发者需要重写 `Item#getName`。

[animation]: #itemuseanimation
[consumeeffect]: #consumeeffect
[datacomponent]: datacomponents.md
[datacompreg]: datacomponents.md#创建自定义数据组件
[extensibleenum]: ../advanced/extensibleenums.md
[food]: #food
[hunger]: https://minecraft.wiki/w/Hunger#Mechanics
[item]: index.md
[livingentity]: ../entities/livingentity.md
[modbus]: ../concepts/events.md#事件总线
[mobeffectinstance]: mobeffects.md#mobeffectinstances
[particles]: ../resources/client/particles.md
[potions]: mobeffects.md#potions
[sound]: ../resources/client/sounds.md#creating-soundevents
[registering]: ../concepts/registries.md#methods-for-registering
