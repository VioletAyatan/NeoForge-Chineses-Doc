# 交互（Interactions）

本页旨在让玩家左键、右键或中键点击各种对象这一相当复杂且容易令人困惑的过程更易理解，并说明应在何处使用哪种结果及其原因。

## `HitResult`

为了判断玩家当前正在看什么，Minecraft 使用 `HitResult`。`HitResult` 大致相当于其他游戏引擎中的光线投射结果，其中最值得注意的是包含 `#getLocation` 方法。

命中结果可以是 `HitResult.Type` 枚举所表示的三种类型之一：`BLOCK`、`ENTITY` 或 `MISS`。`BLOCK` 类型的 `HitResult` 可强制转换为 `BlockHitResult`，`ENTITY` 类型的 `HitResult` 可强制转换为 `EntityHitResult`；两种类型都会提供有关命中的 [Block][block] 或 [Entity][entity] 的额外上下文。如果类型为 `MISS`，表示既未命中 Block，也未命中 Entity，不应强制转换为任何一种子类。

每一帧，[物理客户端][physicalside]上的 `Minecraft` 类都会更新当前注视的 `HitResult`，并将其存储在 `hitResult` 字段中。随后可通过 `Minecraft.getInstance().hitResult` 访问此字段。

## 左键点击 Item

- 检查主手 [`ItemStack`][itemstack] 所需的全部[功能标志][featureflag]是否已启用。如果检查失败，流程结束。
- 如果 `Player#cannotAttackWithItem`（检查攻击延迟与 `DataComponents#MINIMUM_ATTACK_CHARGE`）返回 false，流程结束。
- 使用鼠标左键与主手触发 `InputEvent.InteractionKeyMappingTriggered`。如果 [事件][event] 被[取消][cancel]，流程结束。
- 根据你正在注视的对象（使用 `Minecraft` 中的 [`HitResult`][hitresult]），会发生不同情况：
    - 如果持有带有某个 `DataComponents#PIERCING_WEAPON` 的 Item：
        - 仅服务端：调用 `PiercingWeapon#attack`。
            - 使用 `ProjectileUtil#getHitEntitiesAlong` 获取满足以下条件的所有 Entity：
                - 位于攻击者交互距离与 Item 攻击距离（`DataComponents#ATTACK_RANGE`）内。
                - 并非无敌，并且可被 Projectile 命中。
                - 不是同一载具的乘客。
            - 对每个 Entity 调用 `LivingEntity#stabAttack`；如果目标成功受到伤害、被击退或被迫下乘，返回 true：
                - 通过 `ItemStack#getDamageSource` 获取伤害来源。
                - 调用 [`Entity#hurtServer`][hurt]。
                - 如果穿刺武器造成击退，则调用 `LivingEntity#causeExtraKnockback`。
                - 如果穿刺武器会在命中时迫使乘客下乘，并且目标是乘客，则调用 `Entity#stopRiding`。
                - 如果目标是 `LivingEntity`，则调用 `ItemStack#hurtEnemy`。
                - 如果目标成功受到伤害，则应用 `EnchantmentHelper#doPostAttackEffects`。
                - 如果目标成功受到伤害、被击退或被迫下乘，则：  
                    - 使用目标 Entity 调用 `LivingEntity#setLastHurtMob`。
                    - 调用 `LivingEntity#playAttackSound`。
        - 调用 `LivingEntity#onAttack`。
        - 调用 `LivingEntity#lungerForwardMaybe`。它会通过 `EnchantmentHelper#doLungeEffects` 应用突进效果。
        - 仅服务端：如果至少有一个目标的 `LivingEntity#stabAttack` 返回 true，则调用 `PiercingWeapon#makeHitSound`。
        - 仅服务端：调用 `PiercingWeapon#makeSound`。
        - 调用 `LivingEntity#swing`。
    - 如果正在注视触及范围内的 [Entity][entity]：
        - 触发 `AttackEntityEvent`。如果事件被取消，流程结束。
        - 调用 `IItemExtension#onLeftClickEntity`。如果返回 true，流程结束。
        - 对目标调用 `Entity#isAttackable`。如果返回 false，流程结束。
        - 对目标调用 `Entity#skipAttackInteraction`。如果返回 true，流程结束。
        - 如果目标位于 `minecraft:redirectable_projectile` tag 中（默认包括火球与风弹），并且是 `Projectile` 实例，则目标会被弹开，流程结束。
        - 将 Entity 基础伤害（`minecraft:attack_damage` [attribute][attribute] 的值）与附魔加成伤害分别计算为两个 float。如果两者都为 0，流程结束。
            - 请注意，这不包括主手 Item 的 [attribute modifier][attributemodifier]；它们会在检查后添加。
        - 将主手 Item 的 `minecraft:attack_damage` attribute modifier 添加到基础伤害。
        - 触发 `CriticalHitEvent`。如果事件的 `#isCriticalHit` 方法返回 true，则基础伤害乘以事件 `#getDamageMultiplier` 方法返回的值；当[多项条件][critical]通过时，该值默认为 1.5，否则默认为 1.0，但可由事件修改。
        - 将附魔加成伤害添加到基础伤害，得到最终伤害值。
        - 触发 `SweepAttackEvent`。如果事件的 `isSweeping` 方法返回 true，玩家会执行横扫攻击。默认情况下，它会检查攻击冷却是否 > 90%、攻击是否并非暴击、玩家是否在地面上，以及移动速度是否未超过其 `minecraft:movement_speed` attribute 值。
        - 调用 [`Entity#hurtOrSimulate`][hurt]。如果返回 false，流程结束。
        - 如果目标是 `LivingEntity` 实例、攻击强度大于 90%、玩家正在疾跑，并且经过附魔修改的 `minecraft:attack_knockback` attribute 值大于 0，则调用 `LivingEntity#knockback`。
            - 在该方法中触发 `LivingKnockBackEvent`。如果事件被取消，则不应用击退。
        - 玩家根据 `SweepAttackEvent#isSweeping` 对附近的 `LivingEntity` 执行横扫攻击。
            - 在该方法中，如果 Entity 位于玩家触及范围内且 `Entity#hurtServer` 返回 true，则再次调用 `LivingEntity#knockback`，进而再次触发 `LivingKnockBackEvent`。
        - 调用 `Item#hurtEnemy`。它可用于攻击后效果。例如，如果适用，重锤会在这里将玩家重新弹到空中。
        - 调用 `Item#postHurtEnemy`。在这里应用耐久损伤。
            - 如果耐久归零，使 ItemStack 变为 `ItemStack#EMPTY`，则触发 `PlayerDestroyItemEvent`。
    - 如果正在注视触及范围内的 [Block][block]：
        - 启动 [Block 破坏子流程][blockbreak]。
    - 否则：
        - 触发 `PlayerInteractEvent.LeftClickEmpty`。

## 右键点击 Item

在右键点击流程中，会调用多个返回以下两种结果类型之一的方法（见下文）。如果返回明确成功或明确失败，大多数方法都会取消流程。为便于阅读，下文把这种“明确成功或明确失败”称为“确定结果”。

- 使用鼠标右键与主手触发 `InputEvent.InteractionKeyMappingTriggered`。如果 [事件][event] 被[取消][cancel]，流程结束。
- 检查若干条件，例如你不能处于旁观者模式，或主手 [`ItemStack`][itemstack] 所需的全部[功能标志][featureflag]都已启用。如果任一检查失败，流程结束。
- 根据你正在注视的对象（使用 `Minecraft` 中的 [`HitResult`][hitresult]），会发生不同情况：
    - 如果正在注视触及范围内且未超出世界边界的 [Entity][entity]：
        - 触发 `PlayerInteractEvent.EntityInteractSpecific`。如果事件被取消，流程结束。
        - **对你正在注视的 Entity** 调用 `Entity#interactAt`。如果返回确定结果，流程结束。
            - 要为自己的 Entity 添加行为，请重写此方法。要为原版 Entity 添加行为，请使用事件。
        - 如果 Entity 打开界面（例如村民交易 GUI 或运输矿车 GUI），流程结束。
        - 触发 `PlayerInteractEvent.EntityInteract`。如果事件被取消，流程结束。
        - **对你正在注视的 Entity** 调用 `Entity#interact`。如果返回确定结果，流程结束。
            - 要为自己的 Entity 添加行为，请重写此方法。要为原版 Entity 添加行为，请使用事件。
            - 对于 [`Mob`][livingentity]，`Entity#interact` 的重写会处理拴绳等内容；当主手 `ItemStack` 是刷怪蛋时，还会处理生成幼体，随后将 Mob 特定处理委托给 `Mob#mobInteract`。`Entity#interact` 的结果规则在这里同样适用。
        - 如果正在注视的 Entity 是 `LivingEntity`，则对主手 `ItemStack` 调用 `Item#interactLivingEntity`。如果返回确定结果，流程结束。
    - 如果正在注视触及范围内且未超出世界边界的 [Block][block]：
        - 触发 `PlayerInteractEvent.RightClickBlock`。如果事件被取消，流程结束。也可以在此事件中只明确拒绝使用 Block 或 Item。
        - 调用 `IItemExtension#onItemUseFirst`。如果返回确定结果，流程结束。
        - 如果 `IItemExtension#doesSneakBypassUse` 返回 false，且事件未拒绝使用 Block，则触发 `UseItemOnBlockEvent`。如果事件被取消，使用取消结果；否则调用 `BlockBehaviour#useItemOn`。如果返回确定结果，流程结束。
        - 如果 `InteractionResult` 是 `TryEmptyHandInteraction` 的实例（例如 `TRY_WITH_EMPTY_HAND`），且执行操作的是主手，则调用 `BlockBehaviour#useWithoutItem`。如果返回确定结果，流程结束。
        - 如果事件未拒绝使用 Item，则调用 `Item#useOn`。如果返回确定结果，流程结束。
     - 否则：
        - 触发 `PlayerInteractEvent.RightClickEmpty`。
- 触发 `PlayerInteractEvent.RightClickItem`。如果事件被取消，流程结束。
- 调用 `Item#use`。
    - 如果 `InteractionResult` 是 `Success` 的实例（例如 `SUCCESS`），则将 `ItemStack` 更改为 `Success#heldItemTransformedTo`。
- 如果当前 ItemStack 与原 ItemStack 不匹配且新 ItemStack 为空，则触发 `PlayerDestroyItemEvent`。
- 上述流程再执行一次，这次使用副手而不是主手。

### `InteractionResult`

`InteractionResult` 是密封接口，表示 Item 或空手与某个对象（例如 Entity、Block 等）之间交互的结果。该接口分为四个 record，共有六种可能的默认状态。

首先是 `InteractionResult.Success`，表示操作应视为成功，并结束流程。成功状态有两个参数：`SwingSource` 表示 Entity 是否应在相应[逻辑端][side]挥手；`InteractionResult.ItemContext` 保存交互是否由手持 Item 引起，以及手持 Item 使用后转变成什么。挥手来源由以下某个默认状态决定：`InteractionResult#SUCCESS` 表示客户端挥手，`InteractionResult#SUCCESS_SERVER` 表示服务端挥手，`InteractionResult#CONSUME` 表示不挥手。如果 `ItemStack` 发生变化，通过 `Success#heldItemTransformedTo` 设置 Item 上下文；如果手持 Item 与对象之间没有交互，则通过 `withoutItem` 设置。默认表示发生了 Item 交互，但 Item 没有转变。

```java
// 在某些返回交互结果的方法中

// 物品手里会变成苹果
return InteractionResult.SUCCESS.heldItemTransformedTo(new ItemStack(Items.APPLE));
```

:::info
通常绝不应在同一方法中同时使用 `SUCCESS` 与 `SUCCESS_SERVER`。如果客户端有足够信息判断何时挥手，就应始终使用 `SUCCESS`。否则，如果判断依赖客户端没有的服务端信息，就应使用 `SUCCESS_SERVER`。
:::

接下来是由 `InteractionResult#FAIL` 实现的 `InteractionResult.Fail`，它表示操作应视为失败，不允许继续交互。流程将结束。它可用于任何位置，但在 `Item#useOn` 与 `Item#use` 之外应谨慎使用。许多情况下，使用 `InteractionResult#PASS` 更合理。

最后是分别由 `InteractionResult#PASS` 与 `InteractionResult#TRY_WITH_EMPTY_HAND` 实现的 `InteractionResult.Pass` 和 `InteractionResult.TryWithEmptyHandInteraction`。这些 record 表示操作既不应视为成功，也不应视为失败，流程应继续。除 `BlockBehaviour#useItemOn` 返回 `TRY_WITH_EMPTY_HAND` 外，`PASS` 是所有 `InteractionResult` 方法的默认行为。更具体地说，如果 `BlockBehaviour#useItemOn` 返回 `TRY_WITH_EMPTY_HAND` 以外的任何内容，无论 Item 是否位于主手，都不会调用 `BlockBehaviour#useWithoutItem`。

有些方法有特殊行为或要求，将在下文各节说明。

#### `Item#useOn`

如果希望操作视为成功，但不希望手臂挥动，也不希望获得 `ITEM_USED` 统计值，请使用 `InteractionResult#CONSUME` 并调用 `#withoutItem`。

```java
// 在 Item#useOn 中
return InteractionResult.CONSUME.withoutItem();
```

#### `Item#use`

这是唯一会使用 `Success` 变体（`SUCCESS`、`SUCCESS_SERVER`、`CONSUME`）中转变后 `ItemStack` 的位置。如果由 `Success#heldItemTransformedTo` 设置的结果 `ItemStack` 发生了变化，它会替换发起使用操作的 `ItemStack`。

`Item#use` 的默认实现在 Item 可食用（具有 `DataComponents#CONSUMABLE`）且玩家能够食用（因为饥饿，或 Item 始终可食用）时返回 `InteractionResult#CONSUME`；在 Item 可食用（具有 `DataComponents#CONSUMABLE`）但玩家不能食用时返回 `InteractionResult#FAIL`。如果 Item 可装备（具有 `DataComponents#EQUIPPABLE`），那么换装成功时返回 `InteractionResult#SUCCESS`，并用换下的 Item 替换手持 Item（通过 `heldItemTransformedTo`）；如果盔甲上的附魔具有 `EnchantmentEffectComponents#PREVENT_ARMOR_CHANGE` 组件，则返回 `InteractionResult#FAIL`。如果 Item 可格挡攻击（具有 `DataComponents#BLOCKS_ATTACKS`），则在返回 `InteractionResult#CONSUME` 前调用 `Item#startUsingItem`。否则返回 `InteractionResult#PASS`。

在这里考虑主手时返回 `InteractionResult#FAIL`，会阻止副手行为运行。如果希望副手行为运行（通常确实如此），请改为返回 `InteractionResult#PASS`。

## 中键点击

- 如果 `Minecraft.getInstance().hitResult` 中的 [`HitResult`][hitresult] 为 null 或类型为 `MISS`，流程结束。
- 使用鼠标左键与主手触发 `InputEvent.InteractionKeyMappingTriggered`。如果 [事件][event] 被[取消][cancel]，流程结束。
- 根据你正在注视的对象（使用 `Minecraft.getInstance().hitResult` 中的 `HitResult`），会发生不同情况：
    - 如果正在注视触及范围内的 [Entity][entity]：
        - 如果 `Entity#isPickable` 返回 false，流程结束。
        - 如果 `Player#isWithinEntityInteractionRange` 返回 false，流程结束。
        - 调用 `Entity#getPickResult`。如果快捷栏中存在与结果 `ItemStack` 匹配的槽位，就激活该槽位。否则，如果玩家处于创造模式，则将结果 `ItemStack` 添加到玩家物品栏。
            - 默认情况下，此方法会转发到 `Entity#getPickResult`，模组开发者可重写该方法。
    - 如果正在注视触及范围内的 [Block][block]：
        - 如果 `Player#isWithinBlockInteractionRange` 返回 false，流程结束。
        - 调用 `IBlockExtension#getCloneItemStack`（默认委托给 `BlockBehaviour#getCloneItemStack`），其结果成为“选中的”`ItemStack`。
            - 默认情况下，它返回 `Block` 的 `Item` 表示。
        - 如果按住 Control 键、玩家处于创造模式且目标 Block 具有 [`BlockEntity`][blockentity]：
            - 通过 `BlockEntity#saveCustomOnly` 获取 `BlockEntity` 数据。
                - 作为后处理步骤，调用 `BlockEntity#removeComponentsFromTag`。
            - 通过 `DataComponents#BLOCK_ENTITY_DATA` 将 `BlockEntity` 数据添加到“选中的”`ItemStack`。
        - 如果快捷栏中存在与“选中的”`ItemStack` 匹配的槽位，就激活该槽位。否则，如果玩家处于创造模式，则将“选中的”`ItemStack` 添加到玩家物品栏。

[attribute]: ../entities/attributes.md
[attributemodifier]: ../entities/attributes.md#attribute-modifiers
[block]: ../blocks/index.md
[blockbreak]: ../blocks/index.md#破坏方块
[blockentity]: ../blockentities/index.md
[cancel]: ../concepts/events.md#可取消事件
[critical]: https://minecraft.wiki/w/Damage#Critical_hit
[effect]: mobeffects.md
[entity]: ../entities/index.md
[event]: ../concepts/events.md
[featureflag]: ../advanced/featureflags.md
[hitresult]: #hitresults
[hurt]: ../entities/index.md#damaging-entities
[itemstack]: index.md#itemstacks
[itemuseon]: #itemuseon
[livingentity]: ../entities/livingentity.md
[physicalside]: ../concepts/sides.md#the-physical-side
[side]: ../concepts/sides.md#the-logical-side
