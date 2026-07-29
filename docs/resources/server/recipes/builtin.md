# 内置配方类型（Built-in Recipe Types）

Minecraft 提供了多种可直接使用的配方类型与序列化器。本文将介绍每种配方类型及其生成方式。

## 合成

合成配方通常在工作台、合成器，或 mod 添加的合成台与机器中完成。其配方类型为 `minecraft:crafting`。

### 有序合成

一些最重要的配方——例如工作台、木棍和大多数工具——都通过有序配方创建。这些配方由合成图案或形状定义（因此称为“有序”），物品必须按此方式放入。示例如下：

```json5
{
    "type": "minecraft:crafting_shaped",
    "category": "equipment",
    "key": {
        "#": "minecraft:stick",
        "X": "minecraft:iron_ingot"
    },
    "pattern": [
        "XXX",
        " # ",
        " # "
    ],
    "result": {
        "count": 1,
        "id": "minecraft:iron_pickaxe"
    }
}
```

逐行分析如下：

- `type`：有序配方序列化器的 id，即 `minecraft:crafting_shaped`。
- `category`：可选字段，定义配方书中的 `CraftingBookCategory`。
- `key` 与 `pattern`：二者共同定义物品必须如何放入合成网格。
    - pattern 最多定义三行、每行最多三个字符的字符串，用以描述形状。所有行长度必须相同，即图案必须形成矩形。空格表示应保持为空的槽位。
    - key 将图案中使用的字符与[原料][ingredient]关联。在上述示例中，图案中的所有 `X` 必须是铁锭，所有 `#` 必须是木棍。
- `result`：配方结果，即 [ItemStack 模板的 JSON 表示形式][itemjson]。
- 示例中未显示 `group` 键。这个可选字符串属性会在配方书中创建分组；同一组中的配方会合并显示为一个。
- 示例中未显示 `show_notification`。该可选布尔值为 false 时，会禁用首次使用或解锁时显示在右上角的弹窗。

接下来看看如何在 `RecipeProvider#buildRecipes` 中生成该配方：

```java
// 我们使用 builder 模式，因此没有创建变量。通过调用创建新 builder
// ShapedRecipeBuilder#shaped，配方为类别（在 RecipeCategory 枚举中找到）
// 和结果物品、结果物品和数量或 ItemStackTemplate。
ShapedRecipeBuilder.shaped(this.registries.lookupOrThrow(Registries.ITEM), RecipeCategory.TOOLS, Items.IRON_PICKAXE)
        // 创建图案的线条。每次调用 #pattern 都会添加新行。
        // 图案将被验证，即会检查它们的形状。
        .pattern("XXX")
        .pattern(" # ")
        .pattern(" # ")
        // 创建图案的关键点。必须定义模式中使用的所有非空格字符。
        // 可以接受 Ingredient、TagKey<Item> 或 ItemLike，即物品或方块。
        .define('X', Items.IRON_INGOT)
        .define('#', Items.STICK)
        // 创建配方成就。虽然配方后台系统没有强制要求，
        // 如果省略此，配方 builder 将会崩溃。第一个参数是成就名称，
        // 第二个是条件。通常，你需要对条件使用 has() 快捷方式。
        // 可以通过多次调用 #unlockedBy 来添加多个解锁条件。
        .unlockedBy("has_iron_ingot", this.has(Items.IRON_INGOT))
        // 将配方存储在传递的 RecipeOutput 中，以写入磁盘。
        // 如果要向配方添加条件，可以在输出上设置这些条件。
        .save(this.output);
```

此外，可以分别调用 `#group` 与 `#showNotification` 来设置配方书分组及切换弹窗显示。

### 无序合成

与有序合成配方不同，无序合成配方不关心原料的传入顺序。因此它没有 pattern 和 key，只有原料列表：

```json5
{
    "type": "minecraft:crafting_shapeless",
    "category": "misc",
    "ingredients": [
        "minecraft:brown_mushroom",
        "minecraft:red_mushroom",
        "minecraft:bowl"
    ],
    "result": {
        "count": 1,
        "id": "minecraft:mushroom_stew"
    }
}
```

同样逐行分析：

- `type`：无序配方序列化器的 id，即 `minecraft:crafting_shapeless`。
- `category`：可选字段，定义配方书中的分类。
- `ingredients`：[原料][ingredient]列表。出于配方查看需要，代码会保留列表顺序，但配方本身接受任意顺序的原料。
- `result`：配方结果，即 [ItemStack 模板的 JSON 表示形式][itemjson]。
- 示例中未显示 `group` 键。这个可选字符串属性会在配方书中创建分组；同一组中的配方会合并显示为一个。

接下来看看如何在 `RecipeProvider#buildRecipes` 中生成该配方：

```java
// 我们使用 builder 模式，因此没有创建变量。通过调用创建新 builder
// ShapelessRecipeBuilder#shapeless，配方为类别（在 RecipeCategory 枚举中找到）
// 和结果物品、结果物品和数量或 ItemStackTemplate。
ShapelessRecipeBuilder.shapeless(this.registries.lookupOrThrow(Registries.ITEM), RecipeCategory.MISC, Items.MUSHROOM_STEW)
        // 添加配方原料。可以接受 Ingredient、TagKey<Item> 或 ItemLike。
        // 还存在重载，额外接受数量，多次添加相同的原料。
        .requires(Blocks.BROWN_MUSHROOM)
        .requires(Blocks.RED_MUSHROOM)
        .requires(Items.BOWL)
        // 创建配方成就。虽然配方后台系统没有强制要求，
        // 如果省略此，配方 builder 将会崩溃。第一个参数是成就名称，
        // 第二个是条件。通常，你需要对条件使用 has() 快捷方式。
        // 可以通过多次调用 #unlockedBy 来添加多个解锁条件。
        .unlockedBy("has_mushroom_stew", this.has(Items.MUSHROOM_STEW))
        .unlockedBy("has_bowl", this.has(Items.BOWL))
        .unlockedBy("has_brown_mushroom", this.has(Blocks.BROWN_MUSHROOM))
        .unlockedBy("has_red_mushroom", this.has(Blocks.RED_MUSHROOM))
        // 将配方存储在传递的 RecipeOutput 中，以写入磁盘。
        // 如果要向配方添加条件，可以在输出上设置这些条件。
        .save(this.output);
```

此外，可以调用 `#group` 设置配方书分组。

:::info
为遵循原版标准，单物品配方（例如拆分存储方块）应使用无序配方。
:::

### 灌注物品

灌注配方是一种特殊的单物品合成配方，会将材料物品堆叠的药水内容复制到结果物品堆叠。例如：

```json5
{
    "type": "minecraft:crafting_imbue",
    "category": "misc",
    "material": "minecraft:arrow",
    "result": {
        "count": 8,
        "id": "minecraft:tipped_arrow"
    },
    "source": "minecraft:lingering_potion"
}
```

同样逐行分析：

- `type`：配方序列化器 id，即 `minecraft:crafting_imbue`。
- `category`：可选字段，定义配方书中的分类。
- `group`：可选字符串属性，在配方书中创建分组。同一组中的配方会合并显示为一个，这通常适合转化配方。
- `source`：包含待灌注药水内容的[原料][ingredient]。
- `material`：用于灌注 source 的[原料][ingredient]。
- `result`：配方结果，即 [ItemStack 模板的 JSON 表示形式][itemjson]。

接下来看看如何在 `RecipeProvider#buildRecipes` 中生成该配方：

```java
// 我们使用 builder 模式，因此没有创建变量。通过调用创建新 builder
// CustomCraftingRecipeBuilder#customCrafting，配方为类别（在 RecipeCategory 枚举中找到）
// 以及接受 `Recipe.CommonInfo` 和 `CraftingRecipe.CraftingBookInfo` 的工厂函数
// 并返回 `Recipe` 实例。
CustomCraftingRecipeBuilder.customCrafting(
    RecipeCategory.MISC,
    // 用于构造配方实例的函数。
    (commonInfo, bookInfo) -> new ImbueRecipe(
        commonInfo, bookInfo,
        // 包含药水内容的来源。
        Ingredient.of(Items.LINGERING_POTION),
        // 用于灌注源的材料。
        Ingredient.of(Items.ARROW),
        // 包含药水内容的生成模板。
        new ItemStackTemplate(Items.TIPPED_ARROW, 8)
    )
)
    // 创建配方成就。虽然配方后台系统没有强制要求，
    // 如果省略此，配方 builder 将会崩溃。第一个参数是成就名称，
    // 第二个是条件。通常，你需要对条件使用 has() 快捷方式。
    // 可以通过多次调用 #unlockedBy 来添加多个解锁条件。
    .unlockedBy("has_lingering_potion", this.has(Items.LINGERING_POTION))
    // 将配方存储在传递的 RecipeOutput 中，以写入磁盘。
    // 如果要向配方添加条件，可以在输出上设置这些条件。
    .save(this.output, "tipped_arrow");
```

此外，可以调用 `#group` 设置配方书分组。

### 转化合成

转化配方是一种特殊的单物品合成配方，会将输入物品堆叠的数据组件完整复制到结果物品堆叠。转化通常发生在两个不同物品之间，其中一个是另一个的染色版本。例如：

```json5
{
    "type": "minecraft:crafting_transmute",
    "category": "misc",
    "group": "shulker_box_dye",
    "input": "#minecraft:shulker_boxes",
    "material": "minecraft:blue_dye",
    "material_count": 1,
    "add_material_count_to_result": false,
    "result": {
        "id": "minecraft:blue_shulker_box"
    }
}
```

同样逐行分析：

- `type`：配方序列化器 id，即 `minecraft:crafting_transmute`。
- `category`：可选字段，定义配方书中的分类。
- `group`：可选字符串属性，在配方书中创建分组。同一组中的配方会合并显示为一个，这通常适合转化配方。
- `input`：要转化的[原料][ingredient]。
- `material`：将物品堆叠转换为结果的[原料][ingredient]。
- `material_count`：将物品堆叠转换为结果所需的 `material` 数量。
- `result`：配方结果，即 [ItemStack 模板的 JSON 表示形式][itemjson]。
- `add_material_count_to_result`：是否将所用材料数量加到结果返回的物品数量中。通常用于复制物品数据，例如地图。

接下来看看如何在 `RecipeProvider#buildRecipes` 中生成该配方：

```java
// 我们使用 builder 模式，因此没有创建变量。通过调用创建新 builder
// TransmuteRecipeBuilder#transmute 以及配方类别（在 RecipeCategory 枚举中找到），
    // 原料输入、原料材料和生成的物品。
TransmuteRecipeBuilder.transmute(RecipeCategory.MISC, this.tag(ItemTags.SHULKER_BOXES),
    Ingredient.of(DyeItem.byColor(DyeColor.BLUE)), ShulkerBoxBlock.getBlockByColor(DyeColor.BLUE).asItem())
        // 设置在配方书中显示的配方组。
        .group("shulker_box_dye")
        // 设置转化堆叠所需的材料数量。
        .setMaterialCount(TransmuteRecipe.DEFAULT_MATERIAL_COUNT)
        // 创建配方成就。虽然配方后台系统没有强制要求，
        // 如果省略此，配方 builder 将会崩溃。第一个参数是成就名称，
        // 第二个是条件。通常，你需要对条件使用 has() 快捷方式。
        // 可以通过多次调用 #unlockedBy 来添加多个解锁条件。
        .unlockedBy("has_shulker_box", this.has(ItemTags.SHULKER_BOXES))
        // 将配方存储在传递的 RecipeOutput 中，以写入磁盘。
        // 如果要向配方添加条件，可以在输出上设置这些条件。
        .save(this.output);
```

此外，可以使用 `#addMaterialCountToOutput` 将所用材料数量加到结果数量中。

### 为物品染色

染色配方是一种特殊的单物品合成配方，会将染料物品堆叠的 `DataComponents#DYE` 合并为单个 `DataComponents#DYED_COLOR`，并应用到目标物品堆叠以构造结果物品堆叠。目标物品堆叠的所有其他组件也会复制到结果物品堆叠，与[转化合成][transmute]类似。例如：

```json5
{
    "type": "minecraft:crafting_dye",
    "category": "misc",
    "dye": "#minecraft:dyes",
    "group": "dyed_armor",
    "result": {
        "id": "minecraft:leather_boots"
    },
    "target": "minecraft:leather_boots"
}
```

同样逐行分析：

- `type`：配方序列化器 id，即 `minecraft:crafting_transmute`。
- `category`：可选字段，定义配方书中的分类。
- `group`：可选字符串属性，在配方书中创建分组。同一组中的配方会合并显示为一个，这通常适合染色配方。
- `target`：要应用染料的[原料][ingredient]。
- `dye`：用于为物品堆叠染色的染料[原料][ingredient]。它们都必须具有 `DataComponents#DYE` [数据组件][datacomponent]。
- `result`：配方结果，即 [ItemStack 模板的 JSON 表示形式][itemjson]。

接下来看看如何在 `RecipeProvider#buildRecipes` 中生成该配方：

```java
// 我们使用 builder 模式，因此没有创建变量。通过调用创建新 builder
// CustomCraftingRecipeBuilder#customCrafting，配方为类别（在 RecipeCategory 枚举中找到）
// 以及接受 `Recipe.CommonInfo` 和 `CraftingRecipe.CraftingBookInfo` 的工厂函数
// 并返回 `Recipe` 实例。
CustomCraftingRecipeBuilder.customCrafting(
    RecipeCategory.MISC,
    // 用于构造配方实例的函数。
    (commonInfo, bookInfo) -> new DyeRecipe(
        commonInfo, bookInfo,
        // 应用染料的目标。
        Ingredient.of(Items.LEATHER_BOOTS),
        // 可应用于目标的染料。
        this.tag(ItemTags.DYES),
        // 所得到的模板以及所应用的染料颜色。
        new ItemStackTemplate(Items.LEATHER_BOOTS)
    )
)
    // 设置在配方书中显示的配方组。
    .group("dyed_armor")
    // 创建配方成就。虽然配方后台系统没有强制要求，
    // 如果省略此，配方 builder 将会崩溃。第一个参数是成就名称，
    // 第二个是条件。通常，你需要对条件使用 has() 快捷方式。
    // 可以通过多次调用 #unlockedBy 来添加多个解锁条件。
    .unlockedBy("has_leather_boots", this.has(Items.LEATHER_BOOTS))
    // 将配方存储在传递的 RecipeOutput 中，以写入磁盘。
    // 如果要向配方添加条件，可以在输出上设置这些条件。
    .save(this.output, "dyed_leather_boots");
```

### 特殊配方

还有许多专门服务于单一用途（例如复制书、制作烟花）而非通用场景的合成配方。多数情况下，它们会根据输入物品堆叠计算数值，并为输出设置数据组件。这些配方仍可配置，通常接收输入原料与结果模板。例如：

```json5
{
    "type": "minecraft:crafting_special_firework_rocket",
    "fuel": "minecraft:gunpowder",
    "result": {
        "count": 3,
        "id": "minecraft:firework_rocket"
    },
    "shell": "minecraft:paper",
    "star": "minecraft:firework_star"
}
```

这个用于制作烟花火箭的配方指定了生成结果所用的燃料、外壳与烟火之星原料。不过，它假定烟火之星原料具有 `DataComponents#FIREWORK_EXPLOSION` 组件，否则不会添加爆炸效果。

Minecraft 为大多数特殊合成配方添加 `crafting_special_` 前缀，但不强制遵循这一做法。

在 `RecipeProvider#buildRecipes` 中生成该配方的方式如下：

```java
// #special 的参数是 Supplier<Recipe<?>>。
SpecialRecipeBuilder.special(
    () -> new FireworkRocketRecipe(
        Ingredient.of(Items.PAPER),
        Ingredient.of(Items.GUNPOWDER),
        Ingredient.of(Items.FIREWORK_STAR),
        new ItemStackTemplate(Items.FIREWORK_ROCKET, 3)
    )
)
    // #save 的重载允许我们指定一个名称。它也可以用于其他配方 builder。
    .save(this.output, "firework_rocket");
```

原版提供以下特殊合成序列化器（mod 可以添加更多）：

- `minecraft:crafting_special_bannerduplicate`：复制旗帜。
- `minecraft:crafting_special_bookcloning`：复制成书。结果书的世代属性会增加一。
- `minecraft:crafting_special_firework_rocket`：制作烟花火箭。
- `minecraft:crafting_special_firework_star`：制作烟火之星。
- `minecraft:crafting_special_firework_star_fade`：为烟火之星应用淡出颜色。
- `minecraft:crafting_special_mapextending`：扩展已填充地图。
- `minecraft:crafting_special_repairitem`：将两个损坏物品修复为一个。
- `minecraft:crafting_special_shielddecoration`：将旗帜应用到盾牌。
- `minecraft:crafting_decorated_pot`：用陶片制作饰纹陶罐。

## 类熔炉配方

第二类重要配方是通过烧炼或类似过程完成的配方。熔炉（类型 `minecraft:smelting`）、烟熏炉（`minecraft:smoking`）、高炉（`minecraft:blasting`）和营火（`minecraft:campfire_cooking`）中的所有配方都使用相同格式：

```json5
{
    "type": "minecraft:smelting",
    "category": "food",
    "cookingtime": 200,
    "experience": 0.1,
    "ingredient": {
        "item": "minecraft:kelp"
    },
    "result": {
        "id": "minecraft:dried_kelp"
    }
}
```

逐行分析如下：

- `type`：配方序列化器 id，此处为 `minecraft:smelting`。具体值会随所制作的类熔炉配方而不同。
- `category`：可选字段，定义烹饪配方书中的分类。
- `cookingtime`：确定配方处理时长，单位为 tick。所有原版熔炉配方使用 200，烟熏炉与高炉使用 100，营火使用 600。不过，也可以使用任意所需值。
- `experience`：确定完成该配方时奖励的经验量。此字段可选；省略时不奖励经验。
- `ingredient`：配方的输入[原料][ingredient]。
- `result`：配方结果，即 [ItemStack 模板的 JSON 表示形式][itemjson]。

这些配方在 `RecipeProvider#buildRecipes` 中的数据生成写法如下：

```java
// 对于吸烟配方使用 #smoking，对于爆破配方使用 #blasting，对于篝火配方使用 #campfireCooking。
// 所有这些 builder 的工作方式都相同。
SimpleCookingRecipeBuilder.smelting(
        // 我们的输入原料。
        Ingredient.of(Items.KELP),
        // 我们的配方类别。
        RecipeCategory.FOOD,
        CookingBookCategory.FOOD
        // 我们的结果物品。也可能是 ItemStackTemplate。
        Items.DRIED_KELP,
        // 我们的经验奖励
        0.1f,
        // 我们的烹饪时间。
        200
)
        // 配方成就，就像上面的合成配方一样。
        .unlockedBy("has_kelp", this.has(Blocks.KELP))
        // #save 的重载允许我们指定一个名称。
        .save(this.output, "dried_kelp_smelting");
```

:::info
这些配方的配方类型与其配方序列化器相同，即熔炉使用 `minecraft:smelting`、烟熏炉使用 `minecraft:smoking`，依此类推。
:::

## 切石

切石机配方使用 `minecraft:stonecutting` 配方类型。它极其简单，只包含类型、输入和输出：

```json5
{
    "type": "minecraft:stonecutting",
    "ingredient": "minecraft:andesite",
    "result": {
        "count": 2,
        "id": "minecraft:andesite_slab"
    }
}
```

`type` 定义配方序列化器（`minecraft:stonecutting`）。ingredient 是一个[原料][ingredient]，result 是基础的 [ItemStack 模板 JSON][itemjson]。与合成配方一样，还可以选择指定 `group`，以便在配方书中分组。

在 `RecipeProvider#buildRecipes` 中进行数据生成也很简单：

```java
SingleItemRecipeBuilder.stonecutting(Ingredient.of(Items.ANDESITE), RecipeCategory.BUILDING_BLOCKS, Items.ANDESITE_SLAB, 2)
        .unlockedBy("has_andesite", this.has(Items.ANDESITE))
        .save(this.output, "andesite_slab_from_andesite_stonecutting");
```

请注意，单物品配方 builder 不支持真正的物品堆叠结果，因此也不支持带数据组件的结果。不过，配方 codec 支持它们；如果需要此功能，就必须实现自定义 builder。

## 锻造

锻造台支持两种不同的配方序列化器：一种将输入转换为输出，并复制输入的组件（例如附魔）；另一种向输入应用组件。两者都使用 `minecraft:smithing` 配方类型，并需要三个输入，分别称为基础、模板和附加物品。

### 转化锻造

此配方序列化器用于将两个输入物品转换成一个，并保留第一个输入的数据组件。原版主要将其用于下界合金装备，但这里可以使用任意物品：

```json5
{
    "type": "minecraft:smithing_transform",
    "addition": "#minecraft:netherite_tool_materials",
    "base": "minecraft:diamond_axe",
    "result": {
        "id": "minecraft:netherite_axe"
    },
    "template": "minecraft:netherite_upgrade_smithing_template"
}
```

逐行拆解如下：

- `type`：配方序列化器 id，即 `minecraft:smithing_transform`。
- `base`：配方的基础[原料][ingredient]，通常是某件装备。
- `template`：配方的模板[原料][ingredient]，通常是锻造模板。
- `addition`：配方的附加[原料][ingredient]，通常是某种材料，例如下界合金锭。
- `result`：配方结果，即 [ItemStack 模板的 JSON 表示形式][itemjson]。

数据生成期间，在 `RecipeProvider#buildRecipes` 中调用 `SmithingTransformRecipeBuilder#smithing` 添加配方：

```java
SmithingTransformRecipeBuilder.smithing(
        // 模板原料。
        Ingredient.of(Items.NETHERITE_UPGRADE_SMITHING_TEMPLATE),
        // 基础原料。
        Ingredient.of(Items.DIAMOND_AXE),
        // 附加原料。
        this.tag(ItemTags.NETHERITE_TOOL_MATERIALS),
        // 配方书类别。
        RecipeCategory.TOOLS,
        // 结果物品。请注意，虽然配方编解码器在此处接受 ItemStack 模板，但 builder 不接受。
        // 如果需要 ItemStack 模板输出，则需要使用自己的 builder。
        Items.NETHERITE_AXE
)
        // 配方成就，与上面的其他配方一样。
        .unlocks("has_netherite_ingot", this.has(ItemTags.NETHERITE_TOOL_MATERIALS))
        // #save 的重载允许我们指定一个名称。
        .save(this.output, "netherite_axe_smithing");
```

### 纹饰锻造

纹饰锻造是将盔甲纹饰应用到盔甲的过程：

```json5
{
    "type": "minecraft:smithing_trim",
    "addition": "#minecraft:trim_materials",
    "base": "#minecraft:trimmable_armor",
    "pattern": "minecraft:spire",
    "template": "minecraft:bolt_armor_trim_smithing_template"
}
```

再次拆分各项：

- `type`：配方序列化器 id，即 `minecraft:smithing_trim`。
- `base`：配方的基础[原料][ingredient]。所有原版用例都在此处使用 `minecraft:trimmable_armor` 标签。
- `template`：配方的模板[原料][ingredient]。所有原版用例都在此处使用锻造纹饰模板。
- `addition`：配方的附加[原料][ingredient]。所有原版用例都在此处使用 `minecraft:trim_materials` 标签。
- `pattern`：应用到基础原料的纹饰图案。

值得注意的是，该配方序列化器没有 result 字段。这是因为它使用基础输入，并将模板与附加物品“应用”到基础输入；也就是说，它根据其他输入设置基础输入的组件，并将操作结果用作配方结果。

数据生成期间，在 `RecipeProvider#buildRecipes` 中调用 `SmithingTrimRecipeBuilder#smithingTrim` 添加配方：

```java
SmithingTrimRecipeBuilder.smithingTrim(
        // 模板原料。
        Ingredient.of(Items.BOLT_ARMOR_TRIM_SMITHING_TEMPLATE),
        // 基础原料。
        this.tag(ItemTags.TRIMMABLE_ARMOR),
        // 附加原料。
        this.tag(ItemTags.TRIM_MATERIALS),
        // 应用到基础的纹饰图案。
        this.registries.lookupOrThrow(Registries.TRIM_PATTERN).getOrThrow(TrimPatterns.SPIRE),
        // 配方书类别。
        RecipeCategory.MISC
)
        // 配方成就，与上面的其他配方一样。
        .unlocks("has_smithing_trim_template", this.has(Items.BOLT_ARMOR_TRIM_SMITHING_TEMPLATE))
        // #save 的重载允许我们指定一个名称。是的，此名称是从原版复制的。
        .save(this.output, "bolt_armor_trim_smithing_template_smithing_trim");
```

[datacomponent]: ../../../items/datacomponents.md
[ingredient]: ingredients.md
[itemjson]: ../../../items/index.md#json-representation
[transmute]: #transmute-crafting
