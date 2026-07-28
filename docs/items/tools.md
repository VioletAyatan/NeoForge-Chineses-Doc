# 工具（Tools）

工具是主要用于破坏 [Block][block] 的 [Item][item]。许多模组会添加新的工具套装（例如铜制工具）或新的工具类型（例如锤子）。

## 自定义工具套装

一套工具通常由六种物品组成：镐、斧、锹、锄、剑和矛（剑和矛按传统含义并非工具，但为保持一致也列在这里）。所有这些工具都使用以下十四种 [数据组件][datacomponents] 的组合实现：

- `DataComponents#MAX_DAMAGE` 与 `#DAMAGE`：耐久度
- `#MAX_STACK_SIZE`：将堆叠数量设置为 `1`
- `#REPAIRABLE`：在铁砧中修复工具
- `#ENCHANTABLE`：最大[附魔][enchantment]能力
- `#ATTRIBUTE_MODIFIERS`：攻击伤害与攻击速度
- `#TOOL`：挖掘信息
- `#WEAPON`：物品承受的伤害与盾牌禁用
- `#ATTACK_RANGE`：挥动武器时的攻击距离
- `#DAMAGE_TYPE`：造成的伤害类型
- `#MINIMUM_ATTACK_CHARGE`：能够用该武器攻击前所需的最少 tick 数
- `#SWING_ANIMATION`：挥动武器时播放的动画
- `#PIERCING_WEAPON`：刺击多个 Entity
- `#KINETIC_WEAPON`：基于动量的 Item 使用攻击，可攻击多个 Entity
- `#USE_EFFECTS`：使用 Item 时向 Entity 应用某些效果

通常，每种工具会通过 `Item.Properties#tool`、`#sword`、`#spear`，或工具的某个委托方法（`pickaxe`、`axe`、`hoe`、`shovel`）进行设置。这通常通过传入工具 record `ToolMaterial` 处理。请注意，其他通常视为工具的物品（例如剪刀）并未通过数据组件实现其通用挖掘逻辑；它们会直接扩展 `Item`，并重写相关方法来处理挖掘。交互行为（默认右键点击）同样没有数据组件，因此锹、斧与锄分别有自己的工具类：`ShovelItem`、`AxeItem` 和 `HoeItem`。

要创建一套标准工具，必须先定义 `ToolMaterial`。参考值可在 `ToolMaterial` 的常量中找到。此示例使用铜制工具，你可以使用自己的材料并按需要调整这些值。

```java
// 我们将铜放置在石头和铁之间。
public static final ToolMaterial COPPER_MATERIAL = new ToolMaterial(
        // 决定这种材料无法破坏哪些 Block 的标签。请参阅下文了解更多信息。
        MyBlockTags.INCORRECT_FOR_COPPER_TOOL,
        // 决定材料的耐久度。
        // 石制工具为 131，铁制工具为 250。
        200,
        // 决定材料的挖掘速度。剑不会使用此值。
        // 石制工具为 4，铁制工具为 6。
        5f,
        // 决定攻击伤害加成。不同工具会以不同方式使用此值。例如，剑会造成 (getAttackDamageBonus() + 4) 点伤害。
        // 石制工具为 1，铁制工具为 2，分别对应剑的 5 点和 6 点攻击伤害；我们的剑现在造成 5.5 点伤害。
        1.5f,
        // 决定材料的附魔能力。这表示此工具可获得的附魔质量。
        // 黄金使用 22，我们将铜放在略低于该值的位置。
        20,
        // 决定哪些物品可以修复此材料的标签。
        Tags.Items.INGOTS_COPPER
);
```

有了 `ToolMaterial` 后，就可以用它[注册][registering]工具。所有 `tool` 委托方法都有相同的三个参数：

```java
// ITEMS 是 DeferredRegister.Items
public static final DeferredItem<Item> COPPER_SWORD = ITEMS.registerItem(
    "copper_sword",
    props -> new Item(
        // 物品 property。
        props.sword(
            // 要使用的材料。
            COPPER_MATERIAL,
            // 特定工具类型的攻击伤害加成。剑为 3，锹为 1.5，镐为 1，斧和锄各不相同。
            3,
            // 特定工具类型的攻击速度修饰值。玩家的默认攻击速度为 4，因此要得到所需的攻击速度
            // 值 1.6f，需要使用 -2.4f。剑为 -2.4f，锹为 -3f，镐为 -2.8f，斧和锄各不相同。
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
            // 要使用的材料。
            COPPER_MATERIAL,
            // 特定工具类型的攻击速度修饰值。此值会先取倒数来缩放，然后
            // 减去 4。
            0.85f,
            // 满足任一条件时，使用矛作为动能武器所应用的伤害倍率。
            0.82f,
            // 矛可以用作动能武器前必须经过的秒数。
            0.65f,
            // 使用动能武器使被击中实体下马时允许经过的最大秒数。
            4.0f,
            // 攻击者使用动能武器使被击中实体下马所需的最小速度（以格为单位）。
            9.0f,
            // 使用动能武器击退被击中实体时允许经过的最大秒数。
            8.25f,
            // 攻击者使用动能武器击退被击中实体所需的最小速度（以格为单位）。
            5.1f,
            // 使用动能武器对被击中实体造成伤害时允许经过的最大秒数。
            12.5f,
            // 攻击者使用动能武器伤害被击中实体所需的最小速度（以格为单位）。
            // 该速度相对于被攻击实体的速度计算。
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
// 这个标签会让我们把这些 Block 加入“无法挖掘它们”的 incorrect tag 中
public static final TagKey<Block> NEEDS_COPPER_TOOL = TagKey.create(BuiltInRegistries.BLOCK.key(), Identifier.fromNamespaceAndPath(MOD_ID, "needs_copper_tool"));

// 该标签会传入我们的材料
public static final TagKey<Block> INCORRECT_FOR_COPPER_TOOL = TagKey.create(BuiltInRegistries.BLOCK.key(), Identifier.fromNamespaceAndPath(MOD_ID, "incorrect_for_cooper_tool"));
```

然后填充 tag。例如，让铜制工具可以挖掘金矿石、金 Block 与红石矿石，但不能挖掘钻石或绿宝石。（红石 Block 已经可由石制工具挖掘。）Tag 文件位于 `src/main/resources/data/mod_id/tags/block/needs_copper_tool.json`（其中 `mod_id` 是你的 mod id）：

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

接下来，对于要传入材料的 tag，可以为所有对石制工具而言不正确、但位于铜制工具 tag 中的 Block 提供负约束。Tag 文件位于 `src/main/resources/data/mod_id/tags/block/incorrect_for_cooper_tool.json`：

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

`Tool` 包含 `Tool.Rule` 列表、持有工具时的默认挖掘速度（默认为 `1`），以及挖掘 Block 时工具应承受的伤害值（默认为 `1`）。`Tool.Rule` 包含三项信息：要应用规则的 Block `HolderSet`、挖掘该集合中 Block 的可选速度，以及用于判断这些 Block 能否由此工具产生掉落物的可选布尔值。如果未设置可选项，就继续检查其他规则。如果所有规则都失败，默认行为是使用默认挖掘速度，且 Block 无法产生掉落物。

:::info
可以通过 `Registry#getOrThrow` 从 `TagKey` 创建 `HolderSet`。
:::

无需使用任何现有 `ToolMaterial` 引用，也能创建任意工具或多功能工具类 Item（即将两种或更多工具合为一体的 Item，例如斧镐合一）。可使用以下部分的组合实现：

- 通过 `Item.Properties#component` 设置 `DataComponents#TOOL`，添加包含自定义规则的 `Tool`。
- 通过 `Item.Properties#attributes` 向 Item 添加 [attribute modifier][attributemodifier]（例如攻击伤害、攻击速度）。
- 通过 `Item.Properties#durability` 添加 Item 耐久度。
- 通过 `Item.Properties#repariable` 允许修复 Item。
- 通过 `Item.Properties#enchantable` 允许为 Item 附魔。
- 通过 `Item.Properties#component` 设置 `DataComponents#WEAPON`，允许 Item 用作武器，并有可能禁用 blocker。
- 重写 `IItemExtension#canPerformAction`，判断 Item 可执行哪些 [`ItemAbility`][itemability]。
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

要创建自己的 `ItemAbility`，使用 `ItemAbility#get`——必要时它会创建新的 `ItemAbility`。然后，在自定义工具类型中按需要重写 `IItemExtension#canPerformAction`。

要查询 `ItemStack` 能否执行某个 `ItemAbility`，调用 `IItemStackExtension#canPerformAction`。请注意，它适用于任意 `Item`，而不仅是工具。

[block]: ../blocks/index.md
[datacomponents]: datacomponents.md
[enchantment]: ../resources/server/enchantments/index.md#enchantment-costs-and-levels
[equippable]: armor.md#equippable
[item]: index.md
[itemability]: #itemability
[registering]: ../concepts/registries.md#methods-for-registering
[tags]: ../resources/server/tags.md
