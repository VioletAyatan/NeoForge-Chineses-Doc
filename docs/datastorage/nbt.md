# 命名二进制标签（Named Binary Tag（NBT））

NBT 是 Minecraft 早期便引入的一种格式，由 Notch 本人编写。Minecraft 的整个代码库广泛使用它存储数据。

## 规范

NBT 规范与 JSON 类似，但存在一些区别：

- byte、short、long 和 float 分别具有独立类型，并分别使用后缀 `b`、`s`、`l` 和 `f`，与 Java 代码中的表示方式相似。
    - double 也可以使用 `d` 后缀，但与 Java 代码相同，该后缀不是必需的。Java 中可用于 integer 的可选 `i` 后缀在 NBT 中不允许使用。
    - 后缀不区分大小写。例如，`64b` 与 `64B` 相同，`0.5F` 与 `0.5f` 相同。
- NBT 没有 boolean，而是使用 byte 表示：`true` 变为 `1b`，`false` 变为 `0b`。
    - 当前实现把所有非零值都视为 `true`，所以 `2b` 同样会被视为 `true`。
- NBT 中不存在与 `null` 对应的值。
- 键周围的引号是可选的。因此，JSON 属性 `"duration": 20` 在 NBT 中既可以写成 `duration: 20`，也可以写成 `"duration": 20`。
- JSON 中所谓的子对象，在 NBT 中称为 **compound tag**，也可以简称 compound。
- 与 JSON 不同，NBT list 不能混合不同类型。list 的类型由第一个元素决定，或在代码中定义。
    - 但是，list 的 list 可以混合不同的 list 类型。例如，一个包含两个 list 的 list，其中第一个是 string list，第二个是 byte list，这是允许的。
- NBT 提供特殊的 **array** 类型。它们不同于 list，但同样使用方括号包含元素。array 有三种：
    - byte array：开头标记为 `B;`，例如 `[B;0b,30b]`
    - integer array：开头标记为 `I;`，例如 `[I;0,-300]`
    - long array：开头标记为 `L;`，例如 `[L;0l,240l]`
- list、array 和 compound tag 允许使用尾随逗号。

## NBT 文件

Minecraft 广泛使用 `.nbt` 文件，例如[数据包][datapack]中的结构文件。包含一个区域内容（一组区块）的区域文件（`.mca`），以及游戏在不同位置使用的各种 `.dat` 文件，也都是 NBT 文件。

NBT 文件通常使用 GZip 压缩，因此它们是二进制文件，无法直接编辑。

## 在代码中使用 NBT

与 JSON 一样，所有 NBT 对象都是某个外层对象的子项。先创建一个外层对象：

```java
CompoundTag tag = new CompoundTag();
```

现在可以把数据放入该 tag：

```java
tag.putInt("Color", 0xffffff);
tag.putString("Level", "minecraft:overworld");
tag.putDouble("IAmRunningOutOfIdeasForNamesHere", 1d);
```

这里提供了若干辅助方法。例如，除接收 `int[]` 的标准形式外，`putIntArray` 还提供了接收 `List<Integer>` 的便捷方法。

当然，也可以从 tag 中取回值：

```java
Optional<Integer> color = tag.getInt("Color");
Optional<String> level = tag.getString("Level");
Optional<Double> d = tag.getDouble("IAmRunningOutOfIdeasForNamesHere");
```

由于无法确定 tag 是否存在，返回值会包装在 Optional 中。对于 primitive 类型，可以使用 `*Or*` 方法之一指定默认值；`ListTag` 可以通过 `getListOrEmpty` 使用默认值，`CompoundTag` 则使用 `getCompoundOrEmpty`。primitive array 类型没有对应的 `*Or*` 方法。

```java
int color = tag.getIntOr("Color", 0xffffff);
String level = tag.getStringOr("Level", "minecraft:overworld");
double d = tag.getDoubleOr("IAmRunningOutOfIdeasForNamesHere", 1d);
```

所有 tag 类型都实现 `Tag` 接口。除 `CompoundTag` 外，大部分 tag 类型基本仅供内部使用，例如 `ByteTag` 或 `StringTag`；如果确实遇到它们，直接使用 `CompoundTag#get` 和 `#put` 方法也可以操作。

不过，有一个明显的例外：`ListTag`。它们的操作方式比较特殊，因为每个 `ListTag` 都与某种由内部计算的 tag 类型关联：

```java
ListTag newList = new ListTag();
// 将标签添加到列表中
newList.add(StringTag.valueOf("Value1"));
newList.add(StringTag.valueOf("Value2"));

// 获取标签
ListTag getList = tag.getListOrEmpty("SomeListHere");
```

最后，如果需要直接操作嵌套在其他 `CompoundTag` 中的 `CompoundTag`，可以使用 `CompoundTag#get` 和 `#put`：

```java
tag.put("Tag", new CompoundTag());

// 如果你想处理 null 情况，也可以使用常规 `get`
tag.getCompoundOrEmpty("Tag");
```

## NBT 的用途

Minecraft 在许多地方使用 NBT。[`BlockEntity`][blockentity] 和 [`Entity`][entity] 会把 NBT 操作抽象为 [value access][valueio]；`ItemStack` 则将其抽象为[数据组件][datacomponents]。

## 另请参阅

- [Minecraft Wiki 上的 NBT 格式][nbtwiki]

[blockentity]: ../blockentities/index.md
[datapack]: ../resources/index.md#data
[datacomponents]: ../items/datacomponents.md
[entity]: ../entities/index.md
[nbtwiki]: https://minecraft.wiki/w/NBT_format
[valueio]: valueio.md
