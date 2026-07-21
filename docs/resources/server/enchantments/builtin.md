import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# 内置附魔效果组件

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
    // The type of this effect component is "minecraft:damage".
    // This means that the effect will modify weapon damage.
    // See below for a list of more effect component types.
    "minecraft:damage": [
        {
            // A value effect that should be applied.
            // In this case, since there's only one, this value effect is just named "effect".
            "effect": {
                // The type of value effect to use. In this case, it is "minecraft:add", so the value (given below) will be added 
                // to the weapon damage value.
                "type": "minecraft:add",

                // The value block. In this case, the value is a LevelBasedValue that starts at 1 and increases by 0.5 every enchantment level.
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
// Passed into 'effects' in an Enchantment during data generation
// See the Data Generation section of the Enchantments entry to learn more
DataComponentMap.builder().set(
    // Selects the "minecraft:damage" component.
    EnchantmentEffectComponents.DAMAGE,

    // Constructs a list of one conditional AddValue without any requirements.
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
// `valueEffect` is an EnchantmentValueEffect instance.
// `enchantLevel` is an integer representing the level of the enchantment
float baseValue = 1.0;
float modifiedValue = valueEffect.process(enchantLevel, server.random, baseValue);
```

### 原版附魔数值效果组件类型

#### 定义为 `DataComponentType<EnchantmentValueEffect>`

- `minecraft:crossbow_charge_time`：修改弩的蓄力时间，单位为秒。快速装填使用此组件。
- `minecraft:trident_spin_attack_strength`：修改三叉戟旋转攻击的“强度”（参见 `TridentItem#releaseUsing`）。激流使用此组件。

#### 定义为 `DataComponentType<List<ConditionalEffect<EnchantmentValueEffect>>>`

与护甲有关：
- `minecraft:armor_effectiveness`：决定护甲抵御此武器的有效程度，范围从 0（无保护）到 1（正常保护）。破甲使用此组件。
- `minecraft:damage_protection`：每“点”伤害减免都会使持有此 Item 时受到的伤害降低 4%，最多降低 80%。爆炸保护、摔落缓冲、火焰保护、保护和弹射物保护使用此组件。

与攻击有关：
- `minecraft:damage`：修改使用此武器造成的攻击伤害。锋利、穿刺、节肢杀手、力量和亡灵杀手使用此组件。
- `minecraft:smash_damage_per_fallen_block`：按坠落的每个方块为重锤增加伤害。致密使用此组件。
- `minecraft:knockback`：修改持有此武器时造成的击退量，以游戏单位计。击退与冲击使用此组件。
- `minecraft:mob_experience`：修改击杀生物获得的经验量。未使用。

与耐久有关：
- `minecraft:item_damage`：修改 Item 受到的耐久损耗。低于 1 的值表示 Item 受到损耗的概率。耐久使用此组件。
- `minecraft:repair_with_xp`：使 Item 使用获得的经验自行修复，并决定修复效率。经验修补使用此组件。

与弹射物有关：
- `minecraft:ammo_use`：修改发射弓或弩时消耗的弹药量。该值会被限制为整数，因此低于 1 时弹药消耗为 0。无限使用此组件。
- `minecraft:projectile_piercing`：修改此武器发射的弹射物可穿透的 Entity 数量。穿透使用此组件。
- `minecraft:projectile_count`：修改使用此弓射击时生成的弹射物数量。多重射击使用此组件。
- `minecraft:projectile_spread`：修改弹射物相对于发射方向的最大散布角度。多重射击使用此组件。
- `minecraft:trident_return_acceleration`：使三叉戟返回其所有者，并修改返回过程中施加于三叉戟的加速度。忠诚使用此组件。

其他：
- `minecraft:block_experience`：修改破坏 Block 获得的经验量。精准采集使用此组件。
- `minecraft:fishing_time_reduction`：使用此钓鱼竿钓鱼时，将浮漂下沉所需时间减少给定秒数。饵钓使用此组件。
- `minecraft:fishing_luck_bonus`：修改钓鱼战利品表使用的[幸运值][luck]。海之眷顾使用此组件。

#### 定义为 `DataComponentType<List<TargetedConditionalEffect<EnchantmentValueEffect>>>`

- `minecraft:equipment_drops`：修改被此武器击杀的 Entity 掉落装备的概率。抢夺使用此组件。

## 基于位置的效果组件

_另请参阅 Minecraft Wiki 上的[基于位置的效果组件][Location Based Effect Components]。_

基于位置的效果组件是实现 `EnchantmentLocationBasedEffect` 的组件。它们定义需要知道附魔持有者在 Level 中所处位置才能执行的动作。其工作依赖两个主要方法：`EnchantmentEntityEffect#onChangedBlock`，在装备附魔 Item 以及持有者改变 `BlockPos` 时调用；`onDeactivate`，在移除附魔 Item 时调用。

以下示例使用基于位置的效果组件类型 `minecraft:attributes` 来改变持有者 Entity 的缩放比例：

<Tabs>
<TabItem value="attribute.json" label="JSON">

```json5
// The type is "minecraft:attributes" (described below).
// In a nutshell, this applies an attribute modifier.
"minecraft:attributes": [
    {
        // This "amount" block is a LevelBasedValue.
        "amount": {
            "type": "minecraft:linear",
            "base": 1,
            "per_level_above_first": 1
        },

        // Which attribute to modify. In this case, modifies "minecraft:scale"
        "attribute": "minecraft:scale",
        // The unique identifier for this attribute modifier. Should not overlap with others, but doesn't need to be registered.
        "id": "examplemod:enchantment.size_change",
        // What operation to use on the attribute. Can be "add_value", "add_multiplied_base", or "add_multiplied_total".
        "operation": "add_value"
    }
],
```

</TabItem>
<TabItem value="attribute.datagen" label="数据生成">

```java
// Passed into the effects of an Enchantment during data generation
DataComponentMap.builder().set(
    // Specifies the "minecraft:attributes" component type.
    EnchantmentEffectComponents.ATTRIBUTES,

    // This component takes a list of these EnchantmentAttributeEffect objects.
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

- `minecraft:all_of`：按顺序运行 Entity 效果列表。
- `minecraft:apply_mob_effect`：对受影响的生物应用[生物效果][mob effect]。
- `minecraft:attribute`：向附魔持有者应用[属性修改器][attribute modifier]。
- `minecraft:change_item_damage`：损耗此 Item 的耐久度。
- `minecraft:damage_entity`：伤害受影响的 Entity。在攻击上下文中会与攻击伤害叠加。
- `minecraft:explode`：生成爆炸。
- `minecraft:ignite`：点燃 Entity。
- `minecraft:apply_impulse`：向 Entity 施加指定速度（分解为方向、坐标和大小）。
- `minecraft:apply_exhaustion`：为玩家增加指定数量的饥饿消耗。
- `minecraft:play_sound`：播放指定声音。
- `minecraft:replace_block`：替换给定偏移位置的 Block。
- `minecraft:replace_disk`：替换圆盘形区域内的 Block。
- `minecraft:run_function`：运行指定的[数据包函数][datapack function]。
- `minecraft:set_block_properies`：修改指定 Block 的 BlockState 属性。
- `minecraft:spawn_particles`：生成粒子。
- `minecraft:summon_entity`：生成 Entity。

### 原版基于位置的效果组件类型

#### 定义为 `DataComponentType<List<ConditionalEffect<EnchantmentLocationBasedEffect>>>`

- `minecraft:location_changed`：持有者的 Block 位置发生变化以及装备此 Item 时，运行基于位置的效果。冰霜行者和灵魂疾行使用此组件。

#### 定义为 `DataComponentType<List<EnchantmentAttributeEffect>>`

- `minecraft:attributes`：向持有者应用属性修改器，并在不再装备附魔 Item 时移除。

## Entity 效果组件

_另请参阅 Minecraft Wiki 上的 [Entity 效果组件][Entity Effect Components]。_

Entity 效果组件是实现 `EnchantmentEntityEffect` 的组件，后者是 `EnchantmentLocationBasedEffect` 的子类型。这些组件会重写 `EnchantmentLocationBasedEffect#onChangedBlock`，转而运行 `EnchantmentEntityEffect#apply`；根据组件具体类型，代码库中的其他位置也会直接调用该 `apply` 方法。因此，效果无需等待持有者的 Block 位置改变即可发生。

除仅注册为基于位置效果组件的 `minecraft:attribute` 外，所有基于位置的效果组件类型也都是有效的 Entity 效果组件类型。

以下是火焰附加附魔中此类组件的 JSON 定义示例：

<Tabs>
<TabItem value="fire.json" label="JSON">

```json5
// This component's type is "minecraft:post_attack" (see below).
"minecraft:post_attack": [
    {
        // Decides whether the "victim" of the attack, the "attacker", or the "damaging entity" (the projectile if there is one, attacker if not) recieves the effect.
        "affected": "victim",
        
        // Decides which enchantment entity effect to apply.
        "effect": {
            // The type of this effect is "minecraft:ignite".
            "type": "minecraft:ignite",
            // "minecraft:ignite" requires a LevelBasedValue as a duration for how long the entity will be ignited.
            "duration": {
                "type": "minecraft:linear",
                "base": 4.0,
                "per_level_above_first": 4.0
            }
        },

        // Decides who (the "victim", "attacker", or "damaging entity") must have the enchantment for it to take effect.
        "enchanted": "attacker",

        // An optional predicate which controls whether the effect applies.
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
// Passed into the effects of an Enchantment during data generation
DataComponentMap.builder().set(
    // Specifies the "minecraft:post_attack" component type.
    EnchantmentEffectComponents.POST_ATTACK,

    // Defines the data for this component. In this case, a list of one TargetedConditionalEffect.
    List.of(
        new TargetedConditionalEffect<>(

            // Determines the "enchanted" field.
            EnchantmentTarget.ATTACKER,

            // Determines the "affected" field.
            EnchantmentTarget.VICTIM,

            // The enchantment entity effect.
            new Ignite(LevelBasedValue.perLevel(4.0F, 4.0F)),

            // The "requirements" clause. 
            // In this case, the only optional part activated is the isDirect boolean flag.
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

此处的 Entity 效果组件是 `minecraft:post_attack`，其效果是 `minecraft:ignite`，由 `Ignite` record 实现。该 record 对 `EnchantmentEntityEffect#apply` 的实现会点燃目标 Entity。

### 原版附魔 Entity 效果组件类型

#### 定义为 `DataComponentType<List<ConditionalEffect<EnchantmentEntityEffect>>>`

- `minecraft:post_piercing_attack`：LivingEntity 向前突进时运行 Entity 效果。突进使用此组件。
- `minecraft:hit_block`：Entity（例如弹射物）命中 Block 时运行 Entity 效果。引雷使用此组件。
- `minecraft:tick`：每个 tick 运行 Entity 效果。灵魂疾行使用此组件。
- `minecraft:projectile_spawned`：弓或弩生成弹射物 Entity 后运行 Entity 效果。火矢使用此组件。

#### 定义为 `DataComponentType<List<TargetedConditionalEffect<EnchantmentEntityEffect>>>`

- `minecraft:post_attack`：攻击对 Entity 造成伤害后运行 Entity 效果。节肢杀手、引雷、火焰附加、荆棘和风爆使用此组件。

有关各项的更多细节，请查看[相关 Minecraft Wiki 页面][relevant minecraft wiki page]。

## 其他原版附魔组件类型

#### 定义为 `DataComponentType<List<ConditionalEffect<DamageImmunity>>>`

- `minecraft:damage_immunity`：免疫指定 Damage Type。冰霜行者使用此组件。

#### 定义为 `DataComponentType<Unit>`

- `minecraft:prevent_equipment_drop`：阻止玩家死亡时掉落此 Item。消失诅咒使用此组件。
- `minecraft:prevent_armor_change`：阻止从护甲槽位卸下此 Item。绑定诅咒使用此组件。

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
