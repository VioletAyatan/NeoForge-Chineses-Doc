# Identifier

`Identifier` 是 Minecraft 中最重要的对象之一。它们可用作[注册表][registries]中的键、数据文件或资源文件的标识符、代码中对模型的引用，以及许多其他用途。一个 `Identifier` 由两部分组成：命名空间（namespace）和路径（path），二者通过 `:` 分隔。

命名空间表示该位置属于哪个模组、资源包或数据包。例如，mod id 为 `examplemod` 的模组会使用 `examplemod` 命名空间；Minecraft 使用 `minecraft` 命名空间。只需创建对应的数据文件夹，便可以按需定义额外的命名空间。数据包通常会这样做，使自己的逻辑与接入原版的位置保持分离。

路径是在命名空间内部对目标对象的引用。例如，`minecraft:cow` 引用 `minecraft` 命名空间中名为 `cow` 的内容——通常会用这个位置从 entity 注册表中取得 cow Entity。另一个示例是 `examplemod:example_item`，它很可能用于从 item 注册表中取得模组的 `example_item`。

`Identifier` 只能包含小写字母、数字、下划线、点和连字符；路径还可以包含正斜杠。请注意，由于 Java 模块的限制，mod id 不能包含连字符，因此模组命名空间也不能包含连字符，但路径中仍然允许使用连字符。

:::info
单独一个 `Identifier` 并不能说明它用于哪种对象。例如，名为 `minecraft:dirt` 的对象可能存在于多个位置。由接收 `Identifier` 的代码负责把它与具体对象关联起来。
:::

可以调用 `Identifier.fromNamespaceAndPath("examplemod", "example_item")` 或 `Identifier.parse("examplemod:example_item")` 创建新的 `Identifier`。如果使用 `withDefaultNamespace`，传入的字符串会作为路径，并使用 `minecraft` 作为命名空间。例如，`Identifier.withDefaultNamespace("example_item")` 会得到 `minecraft:example_item`。

通过 `Identifier#getNamespace()` 和 `#getPath()` 可以分别取得 `Identifier` 的命名空间与路径；通过 `Identifier#toString` 可以取得二者组合后的形式。

`Identifier` 是不可变对象。`Identifier` 上的所有工具方法（例如 `withPrefix` 或 `withSuffix`）都会返回一个新的 `Identifier`。

## 解析 `Identifier`

有些位置（例如注册表）会直接使用 `Identifier`；另一些位置则会按需解析 `Identifier`。例如：

- `Identifier` 用作 GUI 背景的标识符。例如，熔炉 GUI 使用 `minecraft:textures/gui/container/furnace.png`，它映射到磁盘上的 `assets/minecraft/textures/gui/container/furnace.png` 文件。请注意，此处的标识符必须带有 `.png` 后缀。
- `Identifier` 用作 Block 模型的标识符。例如，dirt 的 Block 模型使用 `minecraft:block/dirt`，它映射到磁盘上的 `assets/minecraft/models/block/dirt.json` 文件。此处不需要 `.json` 后缀，而且该标识符会自动映射到 `models` 子文件夹。
- `Identifier` 用作客户端 Item 的标识符。例如，apple 的客户端 Item 使用 `minecraft:apple`（由 `DataComponents#ITEM_MODEL` 定义），它映射到 `assets/minecraft/items/apple.json`。此处不需要 `.json` 后缀，而且该标识符会自动映射到 `items` 子文件夹。
- `Identifier` 用作 Recipe 的标识符。例如，iron block 合成 Recipe 使用 `minecraft:iron_block`，它映射到磁盘上的 `data/minecraft/recipe/iron_block.json` 文件。此处不需要 `.json` 后缀，而且该标识符会自动映射到 `recipe` 子文件夹。

`Identifier` 是否要求文件后缀，以及它究竟会解析到什么位置，取决于具体使用场景。

## `ResourceKey`

`ResourceKey` 把注册表 id 与注册表名称组合起来。例如，一个注册表键的注册表 id 可以是 `minecraft:item`，注册表名称可以是 `minecraft:diamond_sword`。与 `Identifier` 不同，`ResourceKey` 会实际指向一个唯一元素，因此能够明确标识具体元素。它最常用于多个不同注册表彼此接触的场景；数据包，尤其是 worldgen，是一种常见用法。

可以通过静态方法 `ResourceKey#create(ResourceKey<? extends Registry<T>>, Identifier)` 创建新的 `ResourceKey`。第二个参数是注册表名称，第一个参数则是所谓的注册表键。注册表键是一种特殊的 `ResourceKey`，其注册表为根注册表，也就是包含所有其他注册表的注册表。调用 `ResourceKey#createRegistryKey(Identifier)` 并传入目标注册表的 id，即可创建注册表键。

`ResourceKey` 在创建时会被驻留（intern）。因此可以而且建议使用引用相等比较（`==`），但创建它们的开销相对较高。

[registries]: ../concepts/registries.md
[sides]: ../concepts/sides.md
