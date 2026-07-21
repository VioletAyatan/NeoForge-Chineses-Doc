# 工具

工具是主要用于破坏 [Block][block] 的 [Item][item]。许多模组会添加新的工具套装（例如铜制工具）或新的工具类型（例如锤子）。

## 自定义工具套装

一套工具通常由六种 Item 组成：镐、斧、锹、锄、剑和矛（剑和矛按传统含义并非工具，但为保持一致也列在这里）。所有这些工具都使用以下十四种 [数据组件][datacomponents] 的组合实现：

- `DataComponents#MAX_DAMAGE` 与 `#DAMAGE`：耐久度
- `#MAX_STACK_SIZE`：将堆叠数量设置为 `1`
- `#REPAIRABLE`：在铁砧中修复工具
- `#ENCHANTABLE`：最大[附魔][enchantment]值
- `#ATTRIBUTE_MODIFIERS`：攻击伤害与攻击速度
- `#TOOL`：挖掘信息
- `#WEAPON`：Item 承受的伤害与禁用盾牌
- `#ATTACK_RANGE`：挥动武器时的攻击距离
- `#DAMAGE_TYPE`：造成的伤害类型
- `#MINIMUM_ATTACK_CHARGE`：能够用该武器攻击前所需的最少 tick 数
- `#SWING_ANIMATION`：挥动武器时播放的动画
- `#PIERCING_WEAPON`：刺击多个 Entity
- `#KINETIC_WEAPON`：基于动量、通过使用 Item 攻击多个 Entity
- `#USE_EFFECTS`：使用 Item 时向 Entity 应用某些效果

通常，每种工具使用 `Item.Properties#tool`、`#sword`、`#spear` 或工具的某个 delegate（`pickaxe`、`axe`、`hoe`、`shovel`）进行设置。这通常通过传入工具 record `ToolMaterial` 处理。请注意，通常视为工具的其他 Item（例如剪刀）并未通过数据组件实现其通用挖掘逻辑；它们会直接扩展 `Item`，并覆盖相关方法来处理挖掘。交互行为（默认右键点击）同样没有数据组件，因此锹、斧与锄分别有自己的工具类：`ShovelItem`、`AxeItem` 和 `HoeItem`。

要创建一套标准工具，必须先定义 `ToolMaterial`。参考值可在 `ToolMaterial` 的常量中找到。此示例使用铜制工具，你可以使用自己的材料并按需要调整这些值。

```java
// We place copper somewhere between stone and iron.
public static final ToolMaterial COPPER_MATERIAL = new ToolMaterial(
        // The tag that determines what blocks this material cannot break. See below for more information.
        MyBlockTags.INCORRECT_FOR_COPPER_TOOL,
        // Determines the durability of the material.
        // Stone is 131, iron is 250.
        200,
        // Determines the mining speed of the material. Unused by swords.
        // Stone uses 4, iron uses 6.
        5f,
        // Determines the attack damage bonus. Different tools use this differently. For example, swords do (getAttackDamageBonus() + 4) damage.
        // Stone uses 1, iron uses 2, corresponding to 5 and 6 attack damage for swords, respectively; our sword does 5.5 damage now.
        1.5f,
        // Determines the enchantability of the material. This represents how good the enchantments on this tool will be.
        // Gold uses 22, we put copper slightly below that.
        20,
        // The tag that determines what items can repair this material.
        Tags.Items.INGOTS_COPPER
);
```

有了 `ToolMaterial` 后，就可以用它[注册][registering]工具。所有 `tool` delegate 都有相同的三个参数：

```java
// ITEMS is a DeferredRegister.Items
public static final DeferredItem<Item> COPPER_SWORD = ITEMS.registerItem(
    "copper_sword",
    props -> new Item(
        // The item properties.
        props.sword(
            // The material to use.
            COPPER_MATERIAL,
            // The type-specific attack damage bonus. 3 for swords, 1.5 for shovels, 1 for pickaxes, varying for axes and hoes.
            3,
            // The type-specific attack speed modifier. The player has a default attack speed of 4, so to get to the desired
            // value of 1.6f, we use -2.4f. -2.4f for swords, -3f for shovels, -2.8f for pickaxes, varying for axes and hoes.
            -2.4f,
        )
    )
);

public static final DeferredItem<Item> COPPER_AXE = ITEMS.registerItem("copper_axe", props -> new Item(props.axe(...)));
public static final DeferredItem<Item> COPPER_PICKAXE = ITEMS.registerItem("copper_pickaxe", props -> new Item(props.pickaxe(...)));
public static final DeferredItem<Item> COPPER_SHOVEL = ITEMS.registerItem("copper_shovel", props -> new Item(props.shovel(...)));
public static final DeferredItem<Item> COPPER_HOE = ITEMS.registerItem("copper_hoe", props -> new Item(props.hoe(...)));

public static final DeferredItem<Item> COPPER_SPEAR = ITEMS.registerItem(
    "copper_spear",
    props -> new Item(
        props.spear(
            // The material to use.
            COPPER_MATERIAL,
            // The type-specific attack speed modifier. This value is scaled by performing the reciprocal of this value, then
            // subtracting 4.
            0.85f,
            // The damage multiplier applied when using the spear as a kinetic weapon, assuming one of the conditions are met.
            0.82f,
            // The number of seconds that must pass before the spear can be used as a kinetic weapon.
            0.65f,
            // The maximum number of seconds that can pass while using the kinetic weapon to dismount a hit entity.
            4.0f,
            // The minimum speed, in blocks, of the attacker using the kinetic weapon to dismount a hit entity.
            9.0f,
            // The maximum number of seconds that can pass while using the kinetic weapon to knockback a hit entity.
            8.25f,
            // The minimum speed, in blocks, of the attacker using the kinetic weapon to knockack a hit entity.
            5.1f,
            // The maximum number of seconds that can pass while using the kinetic weapon to damage a hit entity.
            12.5f,
            // The minimum speed, in blocks, of the attacker using the kinetic weapon to damage a hit entity. This is relative
            // to the attacked entity's speed.
            4.6f
        )
    )
);
```

:::info
`tool` 还接受两个额外参数：表示哪些 Block 可被挖掘的 `TagKey`，以及 blocker（例如盾牌）被命中后禁用的秒数。
:::

### Tag

创建 `ToolMaterial` 时，会为其分配一个 Block [tag][tags]，其中包含使用该工具破坏后不会掉落任何物品的 Block。例如，`minecraft:incorrect_for_stone_tool` tag 包含钻石矿石等 Block，`minecraft:incorrect_for_iron_tool` tag 则包含黑曜石与远古残骸等 Block。为了更容易按不正确的挖掘等级分配 Block，还提供了一个 tag，用于收录需要使用该工具才能挖掘的 Block。例如，`minecraft:needs_iron_tool` tag 包含钻石矿石等 Block，`minecraft:needs_diamond_tool` tag 包含黑曜石与远古残骸等 Block。

如果符合需求，可以为你的工具复用某个 incorrect tag。例如，如果只想让铜制工具成为耐久度更高的石制工具，可以传入 `BlockTags#INCORRECT_FOR_STONE_TOOL`。

也可以创建自己的 tag：

```java
// This tag will allow us to add these blocks to the incorrect tags that cannot mine them
public static final TagKey<Block> NEEDS_COPPER_TOOL = TagKey.create(BuiltInRegistries.BLOCK.key(), Identifier.fromNamespaceAndPath(MOD_ID, "needs_copper_tool"));

// This tag will be passed into our material
public static final TagKey<Block> INCORRECT_FOR_COPPER_TOOL = TagKey.create(BuiltInRegistries.BLOCK.key(), Identifier.fromNamespaceAndPath(MOD_ID, "incorrect_for_cooper_tool"));
```

然后填充 tag。例如，让铜可以挖掘金矿石、金 Block 与红石矿石，但不能挖掘钻石或绿宝石。（红石 Block 已经可由石制工具挖掘。）Tag 文件位于 `src/main/resources/data/mod_id/tags/block/needs_copper_tool.json`（其中 `mod_id` 是你的 mod id）：

```json5
{
    "values": [
        "minecraft:gold_block",
        "minecraft:raw_gold_block",
        "minecraft:gold_ore",
        "minecraft:deepslate_gold_ore",
        "minecraft:redstone_ore",
        "minecraft:deepslate_redstone_ore"
    ]
}
```

接下来，对于要传入材料的 tag，可以为所有对石制工具而言不正确、但位于铜制工具 tag 中的工具提供负约束。Tag 文件位于 `src/main/resources/data/mod_id/tags/block/incorrect_for_cooper_tool.json`：

```json5
{
    "values": [
        "#minecraft:incorrect_for_stone_tool"
    ],
    "remove": [
        "#mod_id:needs_copper_tool"
    ]
}
```

最后，如上所示，将 tag 传入材料实例。

如果想检查工具能否使某个 BlockState 掉落其 Block，调用 `Tool#isCorrectForDrops`。可以使用 `DataComponents#TOOL` 调用 `ItemStack#get` 来获取 `Tool`。

## 自定义工具

可通过 `Item.Properties#component`，把 `Tool` [数据组件][datacomponents]（即 `DataComponents#TOOL`）添加到 Item 的默认组件列表中，以创建自定义工具。

`Tool` 包含 `Tool.Rule` 列表、持有工具时的默认挖掘速度（默认为 `1`），以及挖掘 Block 时工具应承受的伤害值（默认为 `1`）。`Tool.Rule` 包含三项信息：要应用 rule 的 Block `HolderSet`、挖掘该集合中 Block 的可选速度，以及用于判断这些 Block 能否由此工具产生掉落物的可选 boolean。如果未设置可选项，就继续检查其他 rule。如果所有 rule 都失败，默认行为是使用默认挖掘速度，且 Block 无法产生掉落物。

:::info
可以通过 `Registry#getOrThrow` 从 `TagKey` 创建 `HolderSet`。
:::

无需使用任何现有 `ToolMaterial` 引用，也能创建任意工具或多功能工具类 Item（即将两种或更多工具合为一体的 Item，例如斧镐合一）。可使用以下部分的组合实现：

- 通过 `Item.Properties#component` 设置 `DataComponents#TOOL`，添加包含自定义 rule 的 `Tool`。
- 通过 `Item.Properties#attributes` 向 Item 添加 [attribute modifier][attributemodifier]（例如攻击伤害、攻击速度）。
- 通过 `Item.Properties#durability` 添加 Item 耐久度。
- 通过 `Item.Properties#repariable` 允许修复 Item。
- 通过 `Item.Properties#enchantable` 允许为 Item 附魔。
- 通过 `Item.Properties#component` 设置 `DataComponents#WEAPON`，允许 Item 用作武器，并有可能禁用 blocker。
- 覆盖 `IItemExtension#canPerformAction`，判断 Item 可执行哪些 [`ItemAbility`][itemability]。
- 如果希望 Item 根据 `ItemAbility` 在右键点击时修改 BlockState，调用 `IBlockExtension#getToolModifiedState`。
- 将工具添加到某些 `minecraft:enchantable/*` `ItemTags`，使其可应用特定附魔。
- 将工具添加到某些 `minecraft:*_preferred_weapons` tag，使 Mob 更倾向于捡起并使用你的武器。

对于盾牌，可以应用 [`DataComponents#EQUIPPABLE`][equippable] 数据组件将其设为副手装备，并使用 `DataComponents#BLOCKS_ATTACKS` 在激活时减少持有 Entity 所受伤害。

## `ItemAbility`

`ItemAbility` 是对 Item 能做与不能做哪些事情的抽象，包括左键与右键行为。NeoForge 在 `ItemAbilities` 类中提供了默认 `ItemAbility`：

- 斧右键能力：去皮（原木）、除锈（氧化的铜）和除蜡（涂蜡的铜）。
- 锹右键能力：压平（泥土小径）和扑灭（营火）。
- 剪刀能力：挖掘（破坏 Block）、采集（蜜脾）、移除盔甲（铠甲狼）、雕刻（南瓜）、解除（绊线）和修剪（阻止植物生长）。
- 剑横扫、锄耕作、钓鱼竿抛线、三叉戟投掷、刷子刷扫、点火器点燃和望远镜观察等能力。

要创建自己的 `ItemAbility`，使用 `ItemAbility#get`——必要时它会创建新的 `ItemAbility`。然后，在自定义工具类型中按需要覆盖 `IItemExtension#canPerformAction`。

要查询 `ItemStack` 能否执行某个 `ItemAbility`，调用 `IItemStackExtension#canPerformAction`。请注意，它适用于任意 `Item`，而不仅是工具。

[block]: ../blocks/index.md
[datacomponents]: datacomponents.md
[enchantment]: ../resources/server/enchantments/index.md#enchantment-costs-and-levels
[equippable]: armor.md#equippable
[item]: index.md
[itemability]: #itemabilitys
[registering]: ../concepts/registries.md#methods-for-registering
[tags]: ../resources/server/tags.md
