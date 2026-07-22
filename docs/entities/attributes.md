# 属性（Attribute）

Attribute 是 [LivingEntity][livingentity] 的特殊字段，决定最大生命值、速度或盔甲值等基本 property。所有 attribute 都以 double 值存储，并自动同步。原版提供了大量默认 attribute，你也可以添加自己的 attribute。

由于历史实现原因，并非所有 attribute 都适用于所有 Entity。例如，恶魂会忽略飞行速度，跳跃力度也只影响马，不影响玩家。

## 内置 Attribute

### Minecraft

以下 attribute 位于 `minecraft` namespace，其代码内的值可在 `Attributes` 类中找到。

| 名称                             | 代码中                           | 范围           | 默认值 | 用途                                                                                                                                                                  |
|----------------------------------|----------------------------------|----------------|--------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `armor`                          | `ARMOR`                          | `[0,30]`       | 0      | Entity 的盔甲值。值 1 表示快捷栏上方半个胸甲图标。                                                                                                                     |
| `armor_toughness`                | `ARMOR_TOUGHNESS`                | `[0,20]`       | 0      | Entity 的盔甲韧性值。更多信息参见 [Minecraft Wiki][wiki] 上的[盔甲韧性][toughness]。                                                                                    |
| `attack_damage`                  | `ATTACK_DAMAGE`                  | `[0,2048]`     | 2      | Entity 不使用任何武器或类似 Item 时造成的基础攻击伤害。                                                                                                               |
| `attack_knockback`               | `ATTACK_KNOCKBACK`               | `[0,5]`        | 0      | Entity 造成的额外击退。击退还有一项不由此 attribute 表示的基础强度。                                                                                                   |
| `attack_speed`                   | `ATTACK_SPEED`                   | `[0,1024]`     | 4      | Entity 的攻击冷却。数值越高，冷却越多；设置为 0 实际上会重新启用 1.9 之前的战斗方式。                                                                                   |
| `block_break_speed`              | `BLOCK_BREAK_SPEED`              | `[0,1024]`     | 1      | Entity 挖掘 Block 的速度，作为乘法 modifier。更多信息参见[挖掘速度][miningspeed]。                                                                                      |
| `block_interaction_range`        | `BLOCK_INTERACTION_RANGE`        | `[0,64]`       | 4.5    | Entity 能与 Block 交互的距离，以 Block 为单位。                                                                                                                        |
| `burning_time`                   | `BURNING_TIME`                   | `[0,1024]`     | 1      | Entity 被点燃后燃烧时长的 multiplier。                                                                                                                                 |
| `camera_distance`                | `CAMERA_DISTANCE`                | `[0,32]`       | 4      | 第三人称时镜头与 Entity 的距离，包括旁观或骑乘其他 Entity 时。                                                                                                         |
| `explosion_knockback_resistance` | `EXPLOSION_KNOCKBACK_RESISTANCE` | `[0,1]`        | 0      | Entity 的爆炸击退抗性，以比例表示：0 表示无抗性，0.5 表示一半抗性，1 表示完全抗性。                                                                                    |
| `entity_interaction_range`       | `ENTITY_INTERACTION_RANGE`       | `[0,64]`       | 3      | Entity 能与其他 Entity 交互的距离，以 Block 为单位。                                                                                                                   |
| `fall_damage_multiplier`         | `FALL_DAMAGE_MULTIPLIER`         | `[0,100]`      | 1      | Entity 所受摔落伤害的 multiplier。                                                                                                                                     |
| `flying_speed`                   | `FLYING_SPEED`                   | `[0,1024]`     | 0.4    | 飞行速度 multiplier。并非所有飞行 Entity 实际都会使用它，例如恶魂会忽略它。                                                                                           |
| `follow_range`                   | `FOLLOW_RANGE`                   | `[0,2048]`     | 32     | Entity 以玩家为目标／跟随玩家的距离，以 Block 为单位。                                                                                                                |
| `gravity`                        | `GRAVITY`                        | `[1,1]`        | 0.08   | 影响 Entity 的重力，以每 tick 的 Block 数平方表示。                                                                                                                    |
| `jump_strength`                  | `JUMP_STRENGTH`                  | `[0,32]`       | 0.42   | Entity 的跳跃力度。值越高，跳得越高。                                                                                                                                  |
| `knockback_resistance`           | `KNOCKBACK_RESISTANCE`           | `[0,1]`        | 0      | Entity 的击退抗性，以比例表示：0 表示无抗性，0.5 表示一半抗性，1 表示完全抗性。                                                                                        |
| `luck`                           | `LUCK`                           | `[-1024,1024]` | 0      | Entity 的幸运值。对 [战利品表][loottables] 进行随机判定时使用，用于提供额外抽取，或以其他方式修改结果 Item 的品质。                                                   |
| `max_absorption`                 | `MAX_ABSORPTION`                 | `[0,2048]`     | 0      | Entity 的最大伤害吸收值（黄心）。值 1 表示半颗心。                                                                                                                     |
| `max_health`                     | `MAX_HEALTH`                     | `[1,1024]`     | 20     | Entity 的最大生命值。值 1 表示半颗心。                                                                                                                                 |
| `mining_efficiency`              | `MINING_EFFICIENCY`              | `[0,1024]`     | 0      | Entity 挖掘 Block 的速度，作为加法 modifier，仅在所用工具正确时生效。更多信息参见[挖掘速度][miningspeed]。                                                             |
| `movement_efficiency`            | `MOVEMENT_EFFICIENCY`            | `[0,1]`        | 0      | Entity 在灵魂沙等具有减速效果的 Block 上行走时，以线性插值方式应用的移动速度加成。                                                                                     |
| `movement_speed`                 | `MOVEMENT_SPEED`                 | `[0,1024]`     | 0.7    | Entity 的移动速度。值越高，速度越快。                                                                                                                                  |
| `oxygen_bonus`                   | `OXYGEN_BONUS`                   | `[0,1024]`     | 0      | Entity 的氧气加成。值越高，Entity 开始溺水所需时间越长。                                                                                                              |
| `safe_fall_distance`             | `SAFE_FALL_DISTANCE`             | `[-1024,1024]` | 3      | Entity 的安全摔落距离，即不会受到摔落伤害的距离。                                                                                                                      |
| `scale`                          | `SCALE`                          | `[0.0625,16]`  | 1      | Entity 渲染时的缩放比例。                                                                                                                                              |
| `sneaking_speed`                 | `SNEAKING_SPEED`                 | `[0,1]`        | 0.3    | Entity 潜行时应用的移动速度 multiplier。                                                                                                                               |
| `spawn_reinforcements`           | `SPAWN_REINFORCEMENTS_CHANCE`    | `[0,1]`        | 0      | 僵尸生成其他僵尸的概率。它只与困难难度有关，因为普通及更低难度不会出现僵尸增援。                                                                                       |
| `step_height`                    | `STEP_HEIGHT`                    | `[0,10]`       | 0.6    | Entity 的步高，以 Block 为单位。如果为 1，玩家可像走上台阶一样直接走上 1 Block 高的边缘。                                                                             |
| `submerged_mining_speed`         | `SUBMERGED_MINING_SPEED`         | `[0,20]`       | 0.2    | Entity 挖掘 Block 的速度，作为乘法 modifier，仅在 Entity 位于水下时生效。更多信息参见[挖掘速度][miningspeed]。                                                         |
| `sweeping_damage_ratio`          | `SWEEPING_DAMAGE_RATIO`          | `[0,1]`        | 0      | 横扫攻击造成的伤害，占主攻击伤害的比例：0 表示无伤害，0.5 表示一半伤害，1 表示完整伤害。                                                                              |
| `tempt_range`                    | `TEMPT_RANGE`                    | `[0,2048]`     | 10     | 可使用 Item 引诱 Entity 的距离。主要用于牛或猪等被动动物。                                                                                                            |
| `water_movement_efficiency`      | `WATER_MOVEMENT_EFFICIENCY`      | `[0,1]`        | 0      | Entity 位于水下时应用的移动速度 multiplier。                                                                                                                          |
| `waypoint_transmit_range`        | `WAYPOINT_TRANSMIT_RANGE`        | `[0,60000000]` | 0      | Entity 可将自身位置发送到某个 waypoint tracker 的距离。                                                                                                               |
| `waypoint_receive_range`         | `WAYPOINT_RECEIVE_RANGE`         | `[0,60000000]` | 0      | Entity 可接收另一个 transmitter 的距离。                                                                                                                               |

:::warning
Mojang 相当随意地设置了某些 attribute 上限，其中尤其明显的是上限为 30 的盔甲值。NeoForge 不会修改这些上限，但有模组可以更改它们。
:::

### NeoForge

以下 attribute 位于 `neoforge` namespace，其代码内的值可在 `NeoForgeMod` 类中找到。

| 名称               | 代码中             | 范围       | 默认值 | 用途                                                                                                                                                           |
|--------------------|--------------------|------------|--------|----------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `creative_flight`  | `CREATIVE_FLIGHT`  | `[0,1]`    | 0      | 决定是否为 Entity 启用（\> 0）或禁用（\<\= 0）创造模式飞行。                                                                                               |
| `nametag_distance` | `NAMETAG_DISTANCE` | `[0,32]`   | 32     | Entity 名牌可见的最远距离，以 Block 为单位。                                                                                                                   |
| `swim_speed`       | `SWIM_SPEED`       | `[0,1024]` | 1      | Entity 位于水下时应用的移动速度 multiplier。它独立于 `minecraft:water_movement_efficiency` 应用。                                                              |

## 默认 Attribute

创建 `LivingEntity` 时，必须为其注册一组默认 attribute。Entity [生成][spawning]时，会为其设置默认 attribute。默认 attribute 在 [`EntityAttributeCreationEvent`][event] 中注册：

```java
@SubscribeEvent // 位于模组事件总线上
public static void createDefaultAttributes(EntityAttributeCreationEvent event) {
    event.put(
        // 你的实体类型。
        MY_ENTITY.get(),
        // AttributeSupplier。这通常是通过调用 LivingEntity#createLivingAttributes 创建的，
        // 在其上设置你的值，并调用 #build。你还可以从头开始创建 AttributeSupplier
        // 如果需要，请参阅 LivingEntity#createLivingAttributes 的源代码作为示例。
        LivingEntity.createLivingAttributes()
            // 添加具有默认值的属性。
            .add(Attributes.MAX_HEALTH)
            // 添加具有非默认值的属性。
            .add(Attributes.MAX_HEALTH, 50)
            // 构建 AttributeSupplier。
            .build()
    );
}
```

:::tip
某些类有 `LivingEntity#createLivingAttributes` 的专用版本。例如，`Monster` 类提供了可改用的 `Monster#createMonsterAttributes` 方法。
:::

某些情况下，例如创建[自己的 attribute][custom] 时，需要向现有 Entity 的 `AttributeSupplier` 添加 attribute。这通过 `EntityAttributeModificationEvent` 完成：

```java
@SubscribeEvent // 位于模组事件总线上
public static void modifyDefaultAttributes(EntityAttributeModificationEvent event) {
    event.add(
        // 要为其添加属性的 EntityType。
        EntityType.VILLAGER,
        // 要添加到 EntityType 的 Holder<Attribute>，也可以是自定义属性。
        Attributes.ARMOR,
        // 要添加的属性值。
        // 可以省略，如果省略，将使用属性的默认值。
        10.0
    );
    // 我们还可以检查给定的 EntityType 是否已经具有给定的属性。
    // 在此示例中，如果村民还没有盔甲属性，我们会添加它。
    if (!event.has(EntityType.VILLAGER, Attributes.ARMOR)) {
        event.add(...);
    }
}
```

请注意，与其他一些 registry 不同，自定义 attribute 的存在不会阻止原版客户端连接 NeoForge 服务端。如果原版客户端连接，它只会收到 `minecraft` namespace 中的 attribute。

## 查询 Attribute

Attribute 值存储在 Entity 的 `AttributeMap` 中，它基本上是 `Map<Attribute, AttributeInstance>`。Attribute 实例与 ItemStack 之于 Item 基本类似：attribute 是已注册的单例，而 attribute 实例是绑定到具体 Entity 的具体 attribute 对象。

可以调用 `LivingEntity#getAttributes` 获取 Entity 的 `AttributeMap`，随后按如下方式查询 map：

```java
// 获取属性映射。
AttributeMap attributes = livingEntity.getAttributes();
// 获取属性实例。如果实体没有该属性，则这可能是 null。
AttributeInstance instance = attributes.getInstance(Attributes.ARMOR);
// 获取属性的值。如果需要，将回退到实体的默认值。
double value = attributes.getValue(Attributes.ARMOR);
// 当然，我们也可以首先检查属性是否存在。
if (attributes.hasAttribute(Attributes.ARMOR)) { ... }

// 或者，LivingEntity 还提供快捷方式：
AttributeInstance instance = livingEntity.getAttribute(Attributes.ARMOR);
double value = livingEntity.getAttributeValue(Attributes.ARMOR);
```

:::info
处理 attribute 时，几乎始终使用 `Holder<Attribute>` 而不是 `Attribute`。这也是为什么对于自定义 attribute（见下文），我们会明确存储 `Holder<Attribute>`。
:::

## Attribute Modifier

与查询不同，更改 attribute 值并不容易。主要原因在于，可能需要同时对一个 attribute 进行多项更改。

考虑以下情况：你是一名玩家，攻击伤害 attribute 为 1。你手持钻石剑，它额外造成 6 点攻击伤害，因此总攻击伤害为 7。然后你喝下力量药水，添加了伤害 multiplier。随后又装备了某种饰品，添加另一个 multiplier。

为避免计算错误，并更清楚地表达 attribute 值如何修改，Minecraft 引入了 attribute modifier 系统。在该系统中，每个 attribute 都有一个**基础值**，通常来源于之前讨论的默认 attribute。随后可以添加任意数量的 **attribute modifier**，并可逐个移除，无需担心是否正确应用操作。

首先创建 attribute modifier：

```java
// 修改器的名称。稍后用于从属性映射中查询修饰符
// 和 be（语义上）必须是唯一的。
Identifier id = Identifier.fromNamespaceAndPath("yourmodid", "my_modifier");
// 修饰符本身。
AttributeModifier modifier = new AttributeModifier(
    // 我们之前定义的名称。
    id,
    // 我们修改属性值的量。
    2.0,
    // 用于应用修改器的操作。可能的值为：
    // - AttributeModifier.Operation.ADD_VALUE：将该值添加到总属性值中。
    // - AttributeModifier.Operation.ADD_MULTIPLIED_BASE：将该值与属性基值相乘
    //   并将其添加到总属性值中。
    // - AttributeModifier.Operation.ADD_MULTIPLIED_TOTAL：将该值与总属性值相乘，
    //   即已执行所有先前修改的属性基值，
    //   并将其添加到总属性值中。
    AttributeModifier.Operation.ADD_VALUE
);
```

要应用 modifier，有两个选项：作为 transient modifier 添加，或作为 permanent modifier 添加。Permanent modifier 会保存到磁盘，transient modifier 不会。Permanent modifier 用于永久属性加成（例如某种盔甲或生命值技能），transient modifier 则主要用于[装备][equipment]、[MobEffect][mobeffect]及依赖玩家当前状态的其他 modifier。

```java
AttributeMap attributes = livingEntity.getAttributes();
// 添加瞬态修饰符。如果具有相同 ID 的修饰符已经存在，此将抛出异常。
attributes.getInstance(Attributes.ARMOR).addTransientModifier(modifier);
// 添加瞬态修饰符。如果具有相同 ID 的修饰符已存在，则首先将其删除。
attributes.getInstance(Attributes.ARMOR).addOrUpdateTransientModifier(modifier);
// 添加永久修饰符。如果具有相同 ID 的修饰符已经存在，此将抛出异常。
attributes.getInstance(Attributes.ARMOR).addPermanentModifier(modifier);
// 添加永久修饰符。如果具有相同 ID 的修饰符已存在，则首先将其删除。
attributes.getInstance(Attributes.ARMOR).addOrReplacePermanentModifier(modifier);
```

也可以再次移除这些 modifier：

```java
// 通过修饰符对象删除。
attributes.getInstance(Attributes.ARMOR).removeModifier(modifier);
// 按修饰符 ID 删除。
attributes.getInstance(Attributes.ARMOR).removeModifier(id);
// 删除属性的所有修饰符。
attributes.getInstance(Attributes.ARMOR).removeModifiers();
```

最后，还可以查询 attribute map 是否有某个 ID 的 modifier，并分别查询基础值与 modifier 值：

```java
// 检查修饰符是否存在。
if (attributes.getInstance(Attributes.ARMOR).hasModifier(id)) { ... }
// 获取基础护甲属性值。
double baseValue = attributes.getBaseValue(Attributes.ARMOR);
// 获取某个修饰符的值。
double modifierValue = attributes.getModifierValue(Attributes.ARMOR, id);
```

## 自定义 Attribute

如有需要，也可以添加自己的 attribute。与许多其他系统一样，attribute 是 [registry][registry]，可以向其中注册自己的对象。首先创建 `DeferredRegister<Attribute>`：

```java
public static final DeferredRegister<Attribute> ATTRIBUTES = DeferredRegister.create(
    BuiltInRegistries.ATTRIBUTE, "yourmodid");
```

Attribute 本身可以从三个类中选择：

- `RangedAttribute`：大多数 attribute 使用的类，定义 attribute 的下限、上限与默认值。
- `PercentageAttribute`：与 `RangedAttribute` 类似，但以百分比而不是 float 值显示。由 NeoForge 添加。
- `BooleanAttribute`：只具有语义上的 true（\> 0）与 false（\<\= 0）的 attribute，内部仍使用 double。由 NeoForge 添加。

以 `RangedAttribute` 为例（另外两种的工作方式类似），注册 attribute 如下：

```java
public static final Holder<Attribute> MY_ATTRIBUTE = ATTRIBUTES.register("my_attribute", () -> new RangedAttribute(
    // 要使用的翻译键。
    "attributes.yourmodid.my_attribute",
    // 默认值。
    0,
    // 最小值和最大值。
    -10000,
    10000
));
```

就是这样！只需别忘了把 `DeferredRegister` 注册到模组事件总线，之后即可使用。

:::info
这里使用 `Holder<Attribute>`，而不是像许多其他已注册对象一样使用 `Supplier<RangedAttribute>`，因为这样处理 Entity 容易得多（大多数 Entity 方法都需要 `Holder<Attribute>`）。

如果出于某种原因需要 `Supplier<RangedAttribute>`（或任何其他 `Attribute` 子类的 supplier），应使用 `DeferredHolder<Attribute, RangedAttribute>` 作为类型。

同样规则也适用于任何其他 `Attribute` 子类，即通常使用 `Holder<Attribute>`，而不是 `Supplier<PercentageAttribute>` 或 `Supplier<BooleanAttribute>`。
:::

[custom]: #custom-attributes
[equipment]: ../inventories/container.md#containers-on-entitys
[event]: ../concepts/events.md
[livingentity]: livingentity.md
[loottables]: ../resources/server/loottables/index.md
[miningspeed]: ../blocks/index.md#mining-speed
[mobeffect]: ../items/mobeffects.md
[registry]: ../concepts/registries.md
[spawning]: index.md#spawning-entities
[toughness]: https://minecraft.wiki/w/Armor#Armor_toughness
[wiki]: https://minecraft.wiki
