# Ingredient

`Ingredient` 在[配方][recipes]中用于检查给定 [`ItemStack`][itemstack] 是否为该配方的有效输入。为此，`Ingredient` 实现了 `Predicate<ItemStack>`，可以调用 `#test` 来确认给定 `ItemStack` 是否与该 Ingredient 匹配。

遗憾的是，`Ingredient` 的许多内部实现较为混乱。NeoForge 尽可能绕开 `Ingredient` 类，转而为自定义 `Ingredient` 引入 `ICustomIngredient` 接口。它不能直接替代普通 `Ingredient`，但可以分别通过 `ICustomIngredient#toVanilla` 与 `Ingredient#getCustomIngredient` 在两者之间转换。

## 内置 Ingredient 类型

获取 Ingredient 最简单的方式是使用 `Ingredient#of` 辅助方法。它有多个变体：

- `Ingredient.of()` 返回一个空 Ingredient。
- `Ingredient.of(Blocks.IRON_BLOCK, Items.GOLD_BLOCK)` 返回一个接受铁块或金块的 Ingredient。参数是 [`ItemLike`][itemlike] 可变参数，因此可以传入任意数量的 Block 和 Item。
- `Ingredient.of(Stream.of(Items.DIAMOND_SWORD))` 返回一个接受某个 Item 的 Ingredient。它与前一个方法类似，但参数是 `Stream<ItemLike>`，适用于手头正好已有此类 Stream 的情况。
- `Ingredient.of(BuiltInRegistries.ITEM.getOrThrow(ItemTags.WOODEN_SLABS))` 返回一个接受指定[标签][tag]中任意 Item 的 Ingredient，例如任意木台阶。

此外，NeoForge 还添加了若干 Ingredient：

- `new BlockTagIngredient(BlockTags.CONVERTABLE_TO_MUD)` 返回的 Ingredient 与 `Ingredient.of()` 的标签变体类似，但使用的是 Block 标签。它适用于原本需要使用 Item 标签、但只有 Block 标签可用的情况（例如 `minecraft:convertable_to_mud`）。
- `CustomDisplayIngredient.of(Ingredient.of(Items.DIRT), SlotDisplay.Empty.INSTANCE)` 返回一个带有自定义 [`SlotDisplay`][slotdisplay] 的 Ingredient；你提供的 `SlotDisplay` 决定客户端渲染时如何使用该槽位。
- `CompoundIngredient.of(Ingredient.of(Items.DIRT))` 返回一个带子 Ingredient 的 Ingredient，子项通过构造器的可变参数传入。只要任一子 Ingredient 匹配，该 Ingredient 就匹配。
- `DataComponentIngredient.of(true, new ItemStack(Items.DIAMOND_SWORD))` 返回一个除了匹配 Item 外还会匹配数据组件的 Ingredient。布尔参数表示严格匹配（true）或部分匹配（false）。严格匹配要求数据组件完全一致；部分匹配则要求指定的数据组件一致，但也允许存在其他数据组件。`#of` 还提供了其他重载，可指定多个 `Item` 或其他选项。
- `DifferenceIngredient.of(Ingredient.of(BuiltInRegistries.ITEM.getOrThrow(ItemTags.PLANKS)), Ingredient.of(BuiltInRegistries.ITEM.getOrThrow(ItemTags.NON_FLAMMABLE_WOOD)))` 返回一个 Ingredient，它匹配第一个 Ingredient 中所有不同时匹配第二个 Ingredient 的内容。此示例只匹配可燃烧的木板（即绯红木板、诡异木板和 mod 添加的下界木板之外的所有木板）。
- `IntersectionIngredient.of(Ingredient.of(BuiltInRegistries.ITEM.getOrThrow(ItemTags.PLANKS)), Ingredient.of(BuiltInRegistries.ITEM.getOrThrow(ItemTags.NON_FLAMMABLE_WOOD)))` 返回一个 Ingredient，它匹配同时符合两个子 Ingredient 的所有内容。此示例只匹配不可燃烧的木板（即绯红木板、诡异木板和 mod 添加的下界木板）。

:::info
如果在数据生成中使用的 Ingredient 会接收表示标签实例的 `HolderSet`（即调用 `Registry#getOrThrow` 的那些 Ingredient），则应通过 `HolderLookup.Provider` 获取该 `HolderSet`：先使用 `HolderLookup.Provider#lookupOrThrow` 获取 Item Registry，再以 `TagKey` 调用 `HolderGetter#getOrThrow` 获取 HolderSet。
:::

请记住，NeoForge 提供的 Ingredient 类型都是 `ICustomIngredient`；如本文开头所述，在原版上下文中使用它们之前必须调用 `#toVanilla`。

## 自定义 Ingredient 类型

mod 开发者可以通过 `ICustomIngredient` 系统添加自定义 Ingredient 类型。作为示例，我们来制作一个附魔 Item Ingredient，它接受一个 Item 标签以及由附魔映射到最低等级的 Map：

```java
public class MinEnchantedIngredient implements ICustomIngredient {
    private final TagKey<Item> tag;
    private final Map<Holder<Enchantment>, Integer> enchantments;
    // The codec for serializing the ingredient.
    public static final MapCodec<MinEnchantedIngredient> CODEC = RecordCodecBuilder.mapCodec(inst -> inst.group(
            TagKey.codec(Registries.ITEM).fieldOf("tag").forGetter(e -> e.tag),
            Codec.unboundedMap(Enchantment.CODEC, Codec.INT)
                    .optionalFieldOf("enchantments", Map.of())
                    .forGetter(e -> e.enchantments)
    ).apply(inst, MinEnchantedIngredient::new));
    // Create a stream codec from the regular codec. In some cases, it might make sense to define
    // a new stream codec from scratch.
    public static final StreamCodec<RegistryFriendlyByteBuf, MinEnchantedIngredient> STREAM_CODEC =
            ByteBufCodecs.fromCodecWithRegistries(CODEC.codec());

    // Allow passing in a pre-existing map of enchantments to levels.
    public MinEnchantedIngredient(TagKey<Item> tag, Map<Holder<Enchantment>, Integer> enchantments) {
        this.tag = tag;
        this.enchantments = enchantments;
    }

    // Check if the passed ItemStack matches our ingredient by verifying the item is in the tag
    // and by testing for presence of all required enchantments with at least the required level.
    @Override
    public boolean test(ItemStack stack) {
        return stack.is(tag) && enchantments.keySet()
                .stream()
                .allMatch(ench -> EnchantmentHelper.getEnchantmentsForCrafting(stack).getLevel(ench) >= enchantments.get(ench));
    }

    // Determines whether this ingredient performs NBT or data component matching (false) or not (true).
    // Also determines whether a stream codec is used for syncing, more on this later.
    // We query enchantments on the stack, therefore our ingredient is not simple.
    @Override
    public boolean isSimple() {
        return false;
    }

    // Returns a stream of items that match this ingredient. Mostly for display purposes.
    // There's a few good practices to follow here:
    // - Always include at least one item, to prevent accidental recognition as empty.
    // - Include each accepted Item at least once.
    // - If #isSimple is true, this should be exact and contain every item that matches.
    //   If not, this should be as exact as possible, but doesn't need to be super accurate.
    // In our case, we use all items in the tag.
    @Override
    public Stream<Holder<Item>> items() {
        return BuiltInRegistries.ITEM.getOrThrow(tag).stream();
    }
}
```

自定义 Ingredient 使用一个 [Registry][registry]，因此必须注册自己的 Ingredient。为此，需要使用 NeoForge 提供的 `IngredientType` 类；它本质上是对 [`MapCodec`][codec] 以及可选 [`StreamCodec`][streamcodec] 的包装。

```java
public static final DeferredRegister<IngredientType<?>> INGREDIENT_TYPES =
        DeferredRegister.create(NeoForgeRegistries.Keys.INGREDIENT_TYPE, ExampleMod.MOD_ID);

public static final Supplier<IngredientType<MinEnchantedIngredient>> MIN_ENCHANTED =
        INGREDIENT_TYPES.register("min_enchanted",
                // The stream codec parameter is optional, a stream codec will be created from the codec
                // using ByteBufCodecs#fromCodec or #fromCodecWithRegistries if the stream codec isn't specified.
                () -> new IngredientType<>(MinEnchantedIngredient.CODEC, MinEnchantedIngredient.STREAM_CODEC));
```

完成后，还需要在 Ingredient 类中重写 `#getType`：

```java
public class MinEnchantedIngredient implements ICustomIngredient {
    // other stuff here

    @Override    
    public IngredientType<?> getType() {
        return MIN_ENCHANTED.get();
    }
}
```

至此，Ingredient 类型就可以使用了。

## JSON 表示形式

由于原版 Ingredient 的能力相当有限，而 NeoForge 又为其引入了一个全新的 Registry，因此也有必要了解内置 Ingredient 与自定义 Ingredient 在 JSON 中的形式。

如果 Ingredient 是一个对象并指定了 `neoforge:ingredient_type`，通常会将其视为非原版 Ingredient。例如：

```json5
{
    "neoforge:ingredient_type": "neoforge:block_tag",
    "tag": "minecraft:convertable_to_mud"
}
```

再来看一个使用自定义 Ingredient 的示例：

```json5
{
    "neoforge:ingredient_type": "examplemod:min_enchanted",
    "tag": "c:swords",
    "enchantments": {
        "minecraft:sharpness": 4
    }
}
```

如果 Ingredient 是字符串，即未指定 `neoforge:ingredient_type`，那么它就是原版 Ingredient。原版 Ingredient 的字符串要么表示一个 Item，要么在带有 `#` 前缀时表示一个标签。

原版 Item Ingredient 示例：

```json5
"minecraft:dirt"
```

原版标签 Ingredient 示例：

```json5
"#c:ingots"
```

[codec]: ../../../datastorage/codecs.md
[itemlike]: ../../../items/index.md#itemlike
[itemstack]: ../../../items/index.md#itemstacks
[recipes]: index.md
[registry]: ../../../concepts/registries.md
[slotdisplay]: index.md#slot-displays
[streamcodec]: ../../../networking/streamcodecs.md
[tag]: ../tags.md
