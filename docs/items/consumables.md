# 消耗品

消耗品是可在一段时间内使用、并在此过程中被“消耗”的 [Item][item]。Minecraft 中所有可食用或饮用的内容，都属于某种消耗品。

## `Consumable` 数据组件

任何可消耗 Item 都具有 [`DataComponents#CONSUMABLE` 组件][datacomponent]。其底层 record `Consumable` 定义 Item 如何被消耗，以及消耗后应用哪些效果。

可以直接调用 record constructor 创建 `Consumable`，也可以通过 `Consumable#builder` 创建；后者会为每个 field 设置默认值，完成后再调用 `build`：

- `consumeSeconds`——表示完全消耗 Item 所需秒数的 `float`。经过指定时间后调用 `Item#finishUsingItem`。默认为 1.6 秒，即 32 tick。
- `animation`——设置使用 Item 时播放的 [`ItemUseAnimation`][animation]。默认为 `ItemUseAnimation#EAT`。
- `sound`——设置消耗 Item 期间播放的 [`SoundEvent`][sound]。它必须是 `Holder` 实例。默认为 `SoundEvents#GENERIC_EAT`。
    - 如果某个 Vanilla 实例不是 `Holder<SoundEvent>`，可以调用 `BuiltInRegistries.SOUND_EVENT.wrapAsHolder(soundEvent)` 获取由 `Holder` 封装的版本。
- `soundAfterConsume`——设置 Item 完成消耗后播放的 [`SoundEvent`][sound]。它会委托给 [`PlaySoundConsumeEffect`][consumeeffect]。
- `hasConsumeParticles`——为 `true` 时，每四个 tick 以及 Item 完全消耗时生成 Item [粒子][particles]。默认为 `true`。
- `onConsume`——添加一个 [`ConsumeEffect`][consumeeffect]，在 Item 通过 `Item#finishUsingItem` 完全消耗后应用。

Vanilla 在 `Consumables` class 中提供了一些消耗品，例如用于[食物][food] Item 的 `#defaultFood`，以及用于[药水][potions]和奶桶的 `#defaultDrink`。

可以调用 `Item.Properties#component` 添加 `Consumable` 组件：

```java
// Assume there is some DeferredRegister.Items ITEMS
public static final DeferredItem<Item> CONSUMABLE = ITEMS.registerSimpleItem(
    "consumable",
    props -> props.component(
        DataComponents.CONSUMABLE,
        Consumable.builder()
            // Spend 2 seconds, or 40 ticks, to consume
            .consumeSeconds(2f)
            // Sets the animation to play while consuming
            .animation(ItemUseAnimation.BLOCK)
            // Play sound while consuming every tick
            .sound(SoundEvents.ARMOR_EQUIP_CHAIN)
            // Play sound once finished consuming
            .soundAfterConsume(SoundEvents.BREEZE_WIND_CHARGE_BURST)
            // Don't show particles while eating
            .hasConsumeParticles(false)
            .onConsume(
                // When finished consuming, applies the effects with a 30% chance
                new ApplyStatusEffectsConsumeEffect(new MobEffectInstance(MobEffects.HUNGER, 600, 0), 0.3F)
            )
            // Can have multiple
            .onConsume(
                // Teleports the entity randomly in a 50 block radius
                new TeleportRandomlyConsumeEffect(100f)
            )
            .build()
    )
);
```

### `ConsumeEffect`

消耗品使用完成后，你可能希望触发某种逻辑，例如添加药水效果。这由 `ConsumeEffect` 处理；通过调用 `Consumable.Builder#onConsume` 将其添加到 `Consumable`。

Vanilla 效果列表可在 `ConsumeEffect` 中找到。

每个 `ConsumeEffect` 都有两个方法：`getType` 指定 registry 对象 `ConsumeEffect.Type`；`apply` 在 Item 完全消耗后调用。`apply` 接受三个参数：执行消耗的 Entity 所在的 `Level`、调用消耗行为的 `ItemStack`，以及正在消耗该对象的 `LivingEntity`。效果成功应用时，方法返回 `true`；失败时返回 `false`。

可通过实现该 interface 来创建 `ConsumeEffect`，并将带有关联 `MapCodec` 与 `StreamCodec` 的 `ConsumeEffect.Type` [注册][registering]到 `BuiltInRegistries#CONSUME_EFFECT_TYPE`：

```java
public record UsePortalConsumeEffect(ResourceKey<Level> level)
    implements ConsumeEffect, Portal {

    @Override
    public boolean apply(Level level, ItemStack stack, LivingEntity entity) {
        if (entity.canUsePortal(false)) {
            entity.setAsInsidePortal(this, entity.blockPosition());

            // Can successfully use portal
            return true;
        }

        // Cannot use portal
        return false;
    }

    @Override
    public ConsumeEffect.Type<? extends ConsumeEffect> getType() {
        // Set to registered object
        return USE_PORTAL.get();
    }

    @Override
    @Nullable
    public TeleportTransition getPortalDestination(ServerLevel level, Entity entity, BlockPos pos) {
        // Set teleport location
    }
}

// In some registrar class
// Assume there is some DeferredRegister<ConsumeEffect.Type<?>> CONSUME_EFFECT_TYPES
public static final Supplier<ConsumeEffect.Type<UsePortalConsumeEffect>> USE_PORTAL =
    CONSUME_EFFECT_TYPES.register("use_portal", () -> new ConsumeEffect.Type<>(
        ResourceKey.codec(Registries.DIMENSION).optionalFieldOf("dimension")
            .xmap(UsePortalConsumeEffect::new, UsePortalConsumeEffect::level),
        ResourceKey.streamCodec(Registries.DIMENSION)
            .map(UsePortalConsumeEffect::new, UsePortalConsumeEffect::level)
    ));

// For some Item.Properties that is adding a CONSUMABLE component
Consumable.builder()
    .onConsume(
        new UsePortalConsumeEffect(Level.END)
    )
    .build();
```

### `ItemUseAnimation`

`ItemUseAnimation` 在功能上相当于一个除 id 与名称之外不定义任何内容的 enum。第一人称下，其用途硬编码在 `ItemHandRenderer#renderArmWithItem` 中；第三人称下则硬编码在 `AvatarRenderer#getArmPose` 中。因此，仅创建新的 `ItemUseAnimation` 只会产生类似 `ItemUseAnimation#NONE` 的效果。

要应用某种动画，需要为第一人称实现 `IClientItemExtensions#applyForgeHandTransform`，和／或为第三人称渲染实现 `IClientItemExtensions#getArmPose`。

#### 创建 `ItemUseAnimation`

首先创建新的 `ItemUseAnimation`。这通过[可扩展 enum][extensibleenum] 系统完成：

```json5
{
    "entries": [
        {
            "enum": "net/minecraft/world/item/ItemUseAnimation",
            "name": "EXAMPLEMOD_ITEM_USE_ANIMATION",
            "constructor": "(ILjava/lang/String;)V",
            "parameters": [
                // The id, should always be -1
                -1,
                // The name, should be a unique identifier
                "examplemod:item_use_animation"
            ]
        }
    ]
}
```

然后可以通过 `valueOf` 获取 enum 常量：

```java
public static final ItemUseAnimation EXAMPLE_ANIMATION = ItemUseAnimation.valueOf("EXAMPLEMOD_ITEM_USE_ANIMATION");
```

接下来即可开始应用 transform。为此，必须创建新的 `IClientItemExtensions`、实现所需方法，并通过 [**模组事件总线**][modbus] 上的 `RegisterClientExtensionsEvent` 注册它：

```java
public class ConsumableClientItemExtensions implements IClientItemExtensions {
    // Implement methods here
}

// In some event handler class
@SubscribeEvent // on the mod event bus only on the physical client
public static void registerClientExtensions(RegisterClientExtensionsEvent event) {
    event.registerItem(
        // The instance of the item extensions
        new ConsumableClientItemExtensions(),
        // A vararg of items that use this
        CONSUMABLE
    )
}
```

#### 第一人称

所有消耗品都具有的第一人称 transform 通过 `IClientItemExtensions#applyForgeHandTransform` 实现：

```java
public class ConsumableClientItemExtensions implements IClientItemExtensions {

    // ...

    @Override
    public boolean applyForgeHandTransform(
        PoseStack poseStack, LocalPlayer player, HumanoidArm arm, ItemStack itemInHand,
        float partialTick, float equipProcess, float swingProcess
    ) {
        // We first need to check if the item is being used and has our animation
        HumanoidArm usingArm = entity.getUsedItemHand() == InteractionHand.MAIN_HAND
            ? entity.getMainArm()
            : entity.getMainArm().getOpposite();
        if (
            entity.isUsingItem() && entity.getUseItemRemainingTicks() > 0
            && usingArm == arm && itemInHand.getUseAnimation() == EXAMPLE_ANIMATION
        ) {
            // Apply transformations to pose stack (translate, scale, mulPose)
            // ...
            return true;
        }

        // Do nothing
        return false;
    }
}
```

#### 第三人称

除 `EAT` 与 `DRINK` 外，所有消耗品都有特殊逻辑的第三人称 transform 通过 `IClientItemExtensions#getArmPose` 实现；`HumanoidModel.ArmPose` 也可扩展，以提供自定义 transform。

由于 `ArmPose` 的 constructor 中需要 lambda，必须使用 `EnumProxy` 引用：

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
                // Point to class where the proxy is located
                // Should be separate as this is a client only class
                "class": "example/examplemod/client/MyClientEnumParams",
                // The field name of the enum proxy
                "field": "CUSTOM_ARM_POSE"
            }
        }
    ]
}
```

```java
// Create the enum parameters
public class MyClientEnumParams {
    public static final EnumProxy<HumanoidModel.ArmPose> CUSTOM_ARM_POSE = new EnumProxy<>(
        HumanoidModel.ArmPose.class,
        // Whether the pose uses both arms
        false,
        // Whether the offhand location should be affected by the model pose
        false,
        // The pose transformer
        (IArmPoseTransformer) MyClientEnumParams::applyCustomModelPose
    );

    private static void applyCustomModelPose(
        HumanoidModel<?> model, HumanoidRenderState state, HumanoidArm arm
    ) {
        // Apply model transforms here
        // ...
    }
}

// In some client only class
public static final HumanoidModel.ArmPose EXAMPLE_POSE = HumanoidModel.ArmPose.valueOf("EXAMPLEMOD_ARM_POSE");
```

然后通过 `IClientItemExtensions#getArmPose` 设置 arm pose：

```java
public class ConsumableClientItemExtensions implements IClientItemExtensions {

    // ...

    @Override
    public HumanoidModel.ArmPose getArmPose(
        LivingEntity entity, InteractionHand hand, ItemStack stack
    ) {
        // We first need to check if the item is being used and has our animation
        if (
            entity.isUsingItem() && entity.getUseItemRemainingTicks() > 0
            && entity.getUsedItemHand() == hand
            && itemInHand.getUseAnimation() == EXAMPLE_ANIMATION
        ) {
            // Return pose to apply
            return EXAMPLE_POSE;
        }

        // Otherwise return null
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
        // Return the sound to play
    }
}
```

## `ConsumableListener`

消耗品与消耗后应用的效果非常有用，但有时某种效果的 property 需要作为其他 [数据组件][datacomponents] 对外提供。例如，猫和狼也会食用[食物][food]并查询其营养值，带有 Potion 内容的 Item 则会查询其颜色以进行渲染。在这些情况下，数据组件会实现 `ConsumableListener` 以提供消耗逻辑。

`ConsumableListener` 只有一个方法：`#onConsume`，它接受当前 Level、正在消耗 Item 的 Entity、被消耗的 Item，以及 Item 上的 `Consumable` 实例。Item 完全消耗后，在 `Item#finishUsingItem` 期间调用 `onConsume`。

添加自己的 `ConsumableListener` 只需[注册新的数据组件][datacompreg] 并实现 `ConsumableListener`。

```java
public record MyConsumableListener() implements ConsumableListener {

    @Override
    public void onConsume(
        Level level, LivingEntity entity, ItemStack stack, Consumable consumable
    ) {
        // Do things here
    }
}
```

### 食物

食物是饥饿系统中的一种 `ConsumableListener`。食物 Item 的全部功能已在 `Item` class 中处理，因此只需将 `FoodProperties` 添加到 `DataComponents#FOOD`，并同时添加消耗品即可。辅助方法 `food` 接受 `FoodProperties` 与 `Consumable` 对象；如未指定后者，则使用 `Consumables#DEFAULT_FOOD`。

可以直接调用 record constructor 创建 `FoodProperties`，也可以通过 `new FoodProperties.Builder()` 创建，并在完成后调用 `build`：

- `nutrition`——设置恢复的饥饿值。以半格饥饿值计数，因此例如 Minecraft 中的牛排恢复 8 点饥饿值。
- `saturationModifier`——计算食用该食物时恢复的[饱和度值][hunger]所用的饱和度 modifier。计算公式为 `min(2 * nutrition * saturationModifier, playerNutrition)`，因此使用 `0.5` 会使实际饱和度值与营养值相同。
- `alwaysEdible`——该 Item 是否始终可食用，即使饥饿条已满。默认为 `false`；金苹果及其他除填充饥饿条外还提供加成的 Item 为 `true`。

```java
// Assume there is some DeferredRegister.Items ITEMS
public static final DeferredItem<Item> FOOD = ITEMS.registerSimpleItem(
    "food",
    props -> props.food(
        new FoodProperties.Builder()
            // Heals 1.5 hearts
            .nutrition(3)
            // Carrot is 0.3
            // Raw Cod is 0.1
            // Cooked Chicken is 0.6
            // Cooked Beef is 0.8
            // Golden Aple is 1.2
            .saturationModifier(0.3f)
            // When set, the food can alway be eaten even with
            //  a full hunger bar.
            .alwaysEdible()
    )
);
```

如需示例或查看 Minecraft 使用的不同值，请查看 `Foods` class。

要获取某个 Item 的 `FoodProperties`，调用 `ItemStack.get(DataComponents.FOOD)`。它可能返回 null，因为并非每个 Item 都可食用。要判断 Item 是否可食用，请对 `getFoodProperties` 调用的结果进行 null 检查。

### Potion 内容

通过 `PotionContents` 表示的[药水][potions]内容是另一种 `ConsumableListener`，其效果会在消耗时应用。它包含要应用的可选 Potion、Potion 颜色的可选 tint、与 Potion 一同应用的自定义 [`MobEffectInstance`][mobeffectinstance] 列表，以及获取 ItemStack 名称时使用的可选 translation key。如果 Item 不是 `PotionItem` subtype，模组开发者需要覆盖 `Item#getName`。

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
