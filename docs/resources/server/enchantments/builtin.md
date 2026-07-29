# 内置附魔效果组件（Built-in Enchantment Effect Components）

原版 Minecraft 提供了许多不同类型的附魔效果组件，可用于[附魔][enchantment]定义。本文将逐一介绍它们，包括用法与代码中的定义。

## 数值效果组件

_另请参阅 Minecraft Wiki 上的[数值效果组件][Value Effect Components]。_

数值效果组件用于会修改游戏中某个数值的附魔，由 `EnchantmentValueEffect` 类实现。如果某个值受到多个数值效果组件修改（例如来自多个附魔），则所有效果都会应用。

数值效果组件可对给定值使用以下任意运算：
- `minecraft:set`：用给定的基于等级的值覆盖原值。
- `minecraft:add`：将指定的基于等级的值加到原值上。
- `minecraft:all_of`：接收其他数值效果的列表，并按声明顺序应用。
- `minecraft:multiply`：将指定的基于等级的系数与原值相乘。
- `minecraft:remove_binomial`：使用二项分布对给定的、基于等级的概率进行抽取。抽取成功时从值中减 1。请注意，许多数值实质上是标志：1 表示完全开启，0 表示完全关闭。
- `minecraft:exponential`：抽取给定的、基于等级的底数与指数，然后计算底数的该次幂，再将结果与原值相乘。

锋利附魔使用数值效果组件 `minecraft:damage`，并通过以下方式实现效果：

<Tabs>
<TabItem value="sharpness.json" label="JSON">

```json5
"effects": {
    // 此效果组件的类型为 "minecraft:damage"。
    // 这意味着该效果将修改武器伤害。
    // 请参阅下文了解更多效果组件类型的列表。
    "minecraft:damage": [
        {
            // 应应用的值效果。
            // 在此情况下，由于只有一个，因此此值效果仅命名为 "effect"。
            "effect": {
                // 要使用的值效果类型。在此情况下，它是 "minecraft:add"，因此将添加值（如下所示）
                // 为武器伤害值。
                "type": "minecraft:add",

                // 值方块。在此情况下，该值为 LevelBasedValue，从 1 开始，每个附魔等级增加 0.5。
                "value": {
                    "type": "minecraft:linear",
                    "base": 1.0,
                    "per_level_above_first": 0.5
                }
            }
        }
    ]
}
```

</TabItem>
<TabItem value="sharpness.datagen" label="数据生成">

```java
// 在数据生成期间通过附魔传递到 'effects'
// 请参阅附魔条目的数据生成部分以了解更多信息
DataComponentMap.builder().set(
    // 选择 "minecraft:damage" 组件。
    EnchantmentEffectComponents.DAMAGE,

    // 构造一个包含一个条件 AddValue 的列表，无任何要求。
    List.of(new ConditionalEffect<>(
        new AddValue(LevelBasedValue.perLevel(1.0F, 0.5F)),
        Optional.empty()))
).build()
```

</TabItem>
</Tabs>

`value` 块中的对象是 [LevelBasedValue]，它可以让数值效果组件根据等级改变效果强度。

可以使用 `EnchantmentValueEffect#process` 方法，根据提供的数值运算调整值：

```java
// `valueEffect` 是 EnchantmentValueEffect 实例。
// `enchantLevel` 是代表附魔等级的整数
float baseValue = 1.0;
float modifiedValue = valueEffect.process(enchantLevel, server.random, baseValue);
```

### 原版附魔数值效果组件类型

#### 定义为 `DataComponentType<EnchantmentValueEffect>`

- `minecraft:crossbow_charge_time`：修改弩的蓄力时间，单位为秒。快速装填使用此组件。
- `minecraft:trident_spin_attack_strength`：修改三叉戟旋转攻击的“强度”（参见 `TridentItem#releaseUsing`）。激流使用此组件。

#### 定义为 `DataComponentType<List<ConditionalEffect<EnchantmentValueEffect>>>`

与盔甲有关：
- `minecraft:armor_effectiveness`：决定盔甲抵御此武器的有效程度，范围从 0（无保护）到 1（正常保护）。破甲使用此组件。
- `minecraft:damage_protection`：每“点”伤害减免都会使持有此物品时受到的伤害降低 4%，最多降低 80%。爆炸保护、摔落缓冲、火焰保护、保护和弹射物保护使用此组件。

与攻击有关：
- `minecraft:damage`：修改使用此武器造成的攻击伤害。锋利、穿刺、节肢杀手、力量和亡灵杀手使用此组件。
- `minecraft:smash_damage_per_fallen_block`：按坠落的每个方块为重锤增加伤害。致密使用此组件。
- `minecraft:knockback`：修改持有此武器时造成的击退量，以游戏单位计。击退与冲击使用此组件。
- `minecraft:mob_experience`：修改击杀生物获得的经验量。未使用。

与耐久有关：
- `minecraft:item_damage`：修改物品受到的耐久损耗。低于 1 的值表示物品受到损耗的概率。耐久使用此组件。
- `minecraft:repair_with_xp`：使物品使用获得的经验自行修复，并决定修复效率。经验修补使用此组件。

与弹射物有关：
- `minecraft:ammo_use`：修改发射弓或弩时消耗的弹药量。该值会被限制为整数，因此低于 1 时弹药消耗为 0。无限使用此组件。
- `minecraft:projectile_piercing`：修改此武器发射的弹射物可穿透的实体数量。穿透使用此组件。
- `minecraft:projectile_count`：修改使用此弓射击时生成的弹射物数量。多重射击使用此组件。
- `minecraft:projectile_spread`：修改弹射物相对于发射方向的最大散布角度。多重射击使用此组件。
- `minecraft:trident_return_acceleration`：使三叉戟返回其所有者，并修改返回过程中施加于三叉戟的加速度。忠诚使用此组件。

其他：
- `minecraft:block_experience`：修改破坏方块获得的经验量。精准采集使用此组件。
- `minecraft:fishing_time_reduction`：使用此钓鱼竿钓鱼时，将浮漂下沉所需时间减少给定秒数。饵钓使用此组件。
- `minecraft:fishing_luck_bonus`：修改钓鱼战利品表使用的[幸运值][luck]。海之眷顾使用此组件。

#### 定义为 `DataComponentType<List<TargetedConditionalEffect<EnchantmentValueEffect>>>`

- `minecraft:equipment_drops`：修改被此武器击杀的实体掉落装备的概率。抢夺使用此组件。

## 基于位置的效果组件

_另请参阅 Minecraft Wiki 上的[基于位置的效果组件][Location Based Effect Components]。_

基于位置的效果组件是实现 `EnchantmentLocationBasedEffect` 的组件。它们定义需要知道附魔持有者在世界中所处位置才能执行的动作。其工作依赖两个主要方法：`EnchantmentEntityEffect#onChangedBlock`，在装备附魔物品以及持有者改变 `BlockPos` 时调用；`onDeactivate`，在移除附魔物品时调用。

以下示例使用基于位置的效果组件类型 `minecraft:attributes` 来改变持有者实体的缩放比例：

<Tabs>
<TabItem value="attribute.json" label="JSON">

```json5
// 类型为 "minecraft:attributes"（如下所述）。
// 简而言之，此应用属性修饰符。
"minecraft:attributes": [
    {
        // 此 "amount" 代码块是 LevelBasedValue。
        "amount": {
            "type": "minecraft:linear",
            "base": 1,
            "per_level_above_first": 1
        },

        // 要修改哪个属性。在此情况下，修改"minecraft:scale"
        "attribute": "minecraft:scale",
        // 此属性修饰符的唯一标识符。不应与其他重叠，但不需要注册。
        "id": "examplemod:enchantment.size_change",
        // 对属性使用什么操作。可以是 "add_value"、"add_multiplied_base" 或 "add_multiplied_total"。
        "operation": "add_value"
    }
],
```

</TabItem>
<TabItem value="attribute.datagen" label="数据生成">

```java
// 在数据生成过程中进入附魔效果
DataComponentMap.builder().set(
    // 指定 "minecraft:attributes" 组件类型。
    EnchantmentEffectComponents.ATTRIBUTES,

    // 该组件获取这些 EnchantmentAttributeEffect 对象的列表。
    List.of(new EnchantmentAttributeEffect(
        Identifier.fromNamespaceAndPath("examplemod", "enchantment.size_change"),
        Attributes.SCALE,
        LevelBasedValue.perLevel(1F, 1F),
        AttributeModifier.Operation.ADD_VALUE
    ))
).build()
```


</TabItem>
</Tabs>

原版添加了以下基于位置的效果：

- `minecraft:all_of`：按顺序运行实体效果列表。
- `minecraft:apply_mob_effect`：对受影响的生物应用[生物效果][mob effect]。
- `minecraft:attribute`：向附魔持有者应用[属性修改器][attribute modifier]。
- `minecraft:change_item_damage`：损耗此物品的耐久度。
- `minecraft:damage_entity`：伤害受影响的实体。在攻击上下文中会与攻击伤害叠加。
- `minecraft:explode`：生成爆炸。
- `minecraft:ignite`：点燃实体。
- `minecraft:apply_impulse`：向实体施加指定速度（分解为方向、坐标和大小）。
- `minecraft:apply_exhaustion`：为玩家增加指定数量的饥饿消耗。
- `minecraft:play_sound`：播放指定声音。
- `minecraft:replace_block`：替换给定偏移位置的方块。
- `minecraft:replace_disk`：替换圆盘形区域内的方块。
- `minecraft:run_function`：运行指定的[数据包函数][datapack function]。
- `minecraft:set_block_properies`：修改指定方块的方块状态属性。
- `minecraft:spawn_particles`：生成粒子。
- `minecraft:summon_entity`：生成实体。

### 原版基于位置的效果组件类型

#### 定义为 `DataComponentType<List<ConditionalEffect<EnchantmentLocationBasedEffect>>>`

- `minecraft:location_changed`：持有者的方块位置发生变化以及装备此物品时，运行基于位置的效果。冰霜行者和灵魂疾行使用此组件。

#### 定义为 `DataComponentType<List<EnchantmentAttributeEffect>>`

- `minecraft:attributes`：向持有者应用属性修饰符，并在不再装备附魔物品时移除。

## 实体效果组件

_另请参阅 Minecraft Wiki 上的[实体效果组件][Entity Effect Components]。_

实体效果组件是实现 `EnchantmentEntityEffect` 的组件，后者是 `EnchantmentLocationBasedEffect` 的子类型。这些组件会重写 `EnchantmentLocationBasedEffect#onChangedBlock`，转而运行 `EnchantmentEntityEffect#apply`；根据组件具体类型，代码库中的其他位置也会直接调用该 `apply` 方法。因此，效果无需等待持有者的方块位置改变即可发生。

除仅注册为基于位置效果组件的 `minecraft:attribute` 外，所有基于位置的效果组件类型也都是有效的实体效果组件类型。

以下是火焰附加附魔中此类组件的 JSON 定义示例：

<Tabs>
<TabItem value="fire.json" label="JSON">

```json5
// 该组件的类型为 "minecraft:post_attack"（见下文）。
"minecraft:post_attack": [
    {
        // 决定攻击的 "victim"、"attacker" 或 "damaging entity"（存在投射物时指投射物，否则指攻击者）是否获得该效果。
        "affected": "victim",
        
        // 决定应用哪个附魔实体效果。
        "effect": {
            // 此效果的类型为 "minecraft:ignite"。
            "type": "minecraft:ignite",
            // "minecraft:ignite" 需要一个 LevelBasedValue，表示实体被点燃的持续时间。
            "duration": {
                "type": "minecraft:linear",
                "base": 4.0,
                "per_level_above_first": 4.0
            }
        },

        // 决定必须由谁（"victim"、"attacker" 或 "damaging entity"）持有该附魔，效果才会生效。
        "enchanted": "attacker",

        // 控制效果是否适用的可选谓词。
        "requirements": {
            "condition": "minecraft:damage_source_properties",
            "predicate": {
                "is_direct": true
            }
        }
    }
]
```

</TabItem>
<TabItem value="fire.datagen" label="数据生成">

```java
// 在数据生成过程中进入附魔效果
DataComponentMap.builder().set(
    // 指定 "minecraft:post_attack" 组件类型。
    EnchantmentEffectComponents.POST_ATTACK,

    // 定义此组件的数据。在其情况下，列表中包含一个 TargetedConditionalEffect。
    List.of(
        new TargetedConditionalEffect<>(

            // 确定 "enchanted" 字段。
            EnchantmentTarget.ATTACKER,

            // 确定 "affected" 字段。
            EnchantmentTarget.VICTIM,

            // 附魔实体效果。
            new Ignite(LevelBasedValue.perLevel(4.0F, 4.0F)),

            // "requirements" 子句。
            // 在此情况下，激活的唯一可选部分是 isDirect boolean 标志。
            Optional.of(
                new DamageSourceCondition(
                    Optional.of(
                        new DamageSourcePredicate(
                            List.of(),
                            Optional.empty(),
                            Optional.empty(),
                            Optional.of(true)
                        )
                    )
                )
            )
        )
    )
).build()
```

</TabItem>
</Tabs>

此处的实体效果组件是 `minecraft:post_attack`，其效果是 `minecraft:ignite`，由 `Ignite` record 实现。该 record 对 `EnchantmentEntityEffect#apply` 的实现会点燃目标实体。

### 原版附魔实体效果组件类型

#### 定义为 `DataComponentType<List<ConditionalEffect<EnchantmentEntityEffect>>>`

- `minecraft:post_piercing_attack`：`LivingEntity` 向前突进时运行实体效果。突进使用此组件。
- `minecraft:hit_block`：实体（例如弹射物）命中方块时运行实体效果。引雷使用此组件。
- `minecraft:tick`：每个 tick 运行实体效果。灵魂疾行使用此组件。
- `minecraft:projectile_spawned`：弓或弩生成弹射物实体后运行实体效果。火矢使用此组件。

#### 定义为 `DataComponentType<List<TargetedConditionalEffect<EnchantmentEntityEffect>>>`

- `minecraft:post_attack`：攻击对实体造成伤害后运行实体效果。节肢杀手、引雷、火焰附加、荆棘和风爆使用此组件。

有关各项的更多细节，请查看[相关 Minecraft Wiki 页面][relevant minecraft wiki page]。

## 其他原版附魔组件类型

#### 定义为 `DataComponentType<List<ConditionalEffect<DamageImmunity>>>`

- `minecraft:damage_immunity`：免疫指定伤害类型。冰霜行者使用此组件。

#### 定义为 `DataComponentType<Unit>`

- `minecraft:prevent_equipment_drop`：阻止玩家死亡时掉落此物品。消失诅咒使用此组件。
- `minecraft:prevent_armor_change`：阻止从盔甲槽位卸下此物品。绑定诅咒使用此组件。

#### 定义为 `DataComponentType<List<CrossbowItem.ChargingSounds>>`

- `minecraft:crossbow_charge_sounds`：决定弩蓄力时发生的声音事件。每个条目代表一个附魔等级。

#### 定义为 `DataComponentType<List<Holder<SoundEvent>>>`

- `minecraft:trident_sound`：决定使用三叉戟时发生的声音事件。每个条目代表一个附魔等级。

[enchantment]: index.md
[Value Effect Components]: https://minecraft.wiki/w/Enchantment_definition#Components_with_value_effects
[Entity Effect Components]: https://minecraft.wiki/w/Enchantment_definition#Components_with_entity_effects
[Location Based Effect Components]: https://minecraft.wiki/w/Enchantment_definition#location_changed
[text component]: ../../client/i18n.md
[LevelBasedValue]: ../loottables/index.md#number-provider
[Attribute Effect Component]: https://minecraft.wiki/w/Enchantment_definition#Attribute_effects
[datapack function]: https://minecraft.wiki/w/Function_(Java_Edition)
[luck]: https://minecraft.wiki/w/Luck
[mob effect]: ../../../items/mobeffects.md
[attribute modifier]: ../../../entities/attributes.md#attribute-modifiers
[relevant minecraft wiki page]: https://minecraft.wiki/w/Enchantment_definition#Components_with_entity_effects
