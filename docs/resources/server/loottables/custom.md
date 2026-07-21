# 自定义战利品对象

由于战利品表系统较为复杂，其中会使用多个 [Registry][registries]；mod 开发者可以利用它们中的任何一个来添加更多行为。

所有与战利品表有关的 Registry 都遵循相似模式。要添加新的 Registry 条目，通常需要扩展某个类或实现某个承载功能的接口；随后为序列化定义一个 [codec]，并像往常一样使用 `DeferredRegister` 将该 codec 注册到相应 Registry。这个过程符合大多数 Registry 所采用的“一个基础对象，多个实例”方式（例如 Block/BlockState 和 Item/ItemStack 也是如此）。

## 自定义战利品条目

要创建自定义战利品条目，请扩展 `LootPoolEntryContainer`，或扩展它的两个直接子类之一：`LootPoolSingletonContainer` 或 `CompositeEntryBase`。作为示例，我们要创建一个能够返回某个 [Entity][entity] 掉落物的战利品条目——这纯粹用于演示，实践中更理想的做法是直接引用另一个战利品表。首先创建战利品条目类：

```java
// We extend LootPoolSingletonContainer since we have a "finite" set of drops.
// Some of this code is adapted from NestedLootTable.
public class EntityLootEntry extends LootPoolSingletonContainer {
    public static final MapCodec<EntityLootEntry> CODEC = RecordCodecBuilder.mapCodec(inst ->
        // Add our own fields.
        inst.group(
                        // A value referencing an entity type id.
                        BuiltInRegistries.ENTITY_TYPE.holderByNameCodec().fieldOf("entity").forGetter(e -> e.entity)
                )
                // Add common fields: weight, display, conditions, and functions.
                .and(singletonFields(inst))
                .apply(inst, EntityLootEntry::new)
    );

    // A Holder for the entity type we want to roll the other table for.
    private final Holder<EntityType<?>> entity;

    // It is common practice to have a private constructor and have a static factory method.
    // This is because weight, quality, conditions, and functions are supplied by a lambda below.
    private EntityLootEntry(Holder<EntityType<?>> entity, int weight, int quality, List<LootItemCondition> conditions, List<LootItemFunction> functions) {
        // Pass lambda-provided parameters to super.
        super(weight, quality, conditions, functions);
        // Set our values.
        this.entity = entity;
    }

    // Static builder method, accepting our custom parameters and combining them with a lambda that supplies the values common to all entries.
    public static LootPoolSingletonContainer.Builder<?> entityLoot(Holder<EntityType<?>> entity) {
        // Use the static simpleBuilder() method defined in LootPoolSingletonContainer.
        return simpleBuilder((weight, quality, conditions, functions) -> new EntityLootEntry(entity, weight, quality, conditions, functions));
    }

    // This is where the magic happens. To add an item stack, we generally call #accept on the consumer.
    // However, in this case, we let #getRandomItems do that for us.
    @Override
    public void createItemStack(Consumer<ItemStack> consumer, LootContext context) {
        // Get the entity's loot table. If it doesn't exist, an empty loot table will be returned, so null-checking is not necessary.
        LootTable table = context.getLevel().reloadableRegistries().getLootTable(entity.value().getDefaultLootTable());
        // Use the raw version here, because vanilla does it too. :P
        // #getRandomItemsRaw calls consumer#accept for us on the results of the roll.
        table.getRandomItemsRaw(context, consumer);
    }

    // Tells the entry what to use for serialization.
    @Override
    public MapCodec<EntityLootEntry> codec() {
        return CODEC;
    }
}
```

随后在[注册][registries]时使用该映射 codec：

```java
public static final DeferredRegister<MapCodec<? extends LootPoolEntryContainer>> LOOT_POOL_ENTRY_TYPES =
        DeferredRegister.create(Registries.LOOT_POOL_ENTRY_TYPE, ExampleMod.MOD_ID);

public static final Supplier<MapCodec<EntityLootEntry>> ENTITY_LOOT =
        LOOT_POOL_ENTRY_TYPES.register("entity_loot", () -> EntityLootEntry.CODEC);
```

## 自定义数值提供器

要创建自定义数值提供器，请实现 `NumberProvider` 接口。作为示例，假设我们要创建一个能够反转给定数值正负号的数值提供器：

```java
// We accept another number provider as our base.
public record InvertedSignProvider(NumberProvider base) implements NumberProvider {
    public static final MapCodec<InvertedSignProvider> CODEC = RecordCodecBuilder.mapCodec(inst -> inst.group(
            NumberProviders.CODEC.fieldOf("base").forGetter(InvertedSignProvider::base)
    ).apply(inst, InvertedSignProvider::new));

    // Return a float value. Use the context and the record parameters as needed.
    @Override
    public float getFloat(LootContext context) {
        return -this.base.getFloat(context);
    }

    // Return an int value. Use the context and the record parameters as needed.
    // Overriding this is optional, the default implementation will round the result of #getFloat.
    @Override
    public int getInt(LootContext context) {
        return -this.base.getInt(context);
    }

    // Return a set of the loot context params used by this provider. See below for more information.
    // Since we have a base value, we just defer to the base.
    @Override
    public Set<ContextKey<?>> getReferencedContextParams() {
        return this.base.getReferencedContextParams();
    }

    // Tells the provider what to use for serialization.
    @Override
    public MapCodec<InvertedSignProvider> codec() {
        return CODEC;
    }
}
```

与自定义战利品条目一样，随后在[注册][registries]时使用该 codec：

```java
public static final DeferredRegister<MapCodec<? extends NumberProvider>> LOOT_NUMBER_PROVIDER_TYPES =
        DeferredRegister.create(Registries.LOOT_NUMBER_PROVIDER_TYPE, ExampleMod.MOD_ID);

public static final Supplier<MapCodec<? extends NumberProvider>> INVERTED_SIGN =
        LOOT_NUMBER_PROVIDER_TYPES.register("inverted_sign", () -> InvertedSignProvider.CODEC);
```

## 自定义基于等级的值

可以在 record 中实现 `LevelBasedValue` 接口，以创建自定义 `LevelBasedValue`。同样，作为示例，假设我们要对另一个 `LevelBasedValue` 的输出取反：

```java
public record InvertedSignLevelBasedValue(LevelBasedValue base) implements LevelBaseValue {
    public static final MapCodec<InvertedLevelBasedValue> CODEC = RecordCodecBuilder.mapCodec(inst -> inst.group(
            LevelBasedValue.CODEC.fieldOf("base").forGetter(InvertedLevelBasedValue::base)
    ).apply(inst, InvertedLevelBasedValue::new));

    // Perform our operation.
    @Override
    public float calculate(int level) {
        return -this.base.calculate(level);
    }

    // Tells the value what to use for serialization.
    @Override
    public MapCodec<InvertedLevelBasedValue> codec() {
        return CODEC;
    }
}
```

随后同样在[注册][registries]时使用该 codec：

```java
public static final DeferredRegister<MapCodec<? extends LevelBasedValue>> LEVEL_BASED_VALUES =
        DeferredRegister.create(Registries.ENCHANTMENT_LEVEL_BASED_VALUE_TYPE, ExampleMod.MOD_ID);

public static final Supplier<MapCodec<InvertedSignLevelBasedValue>> INVERTED_SIGN =
        LEVEL_BASED_VALUES.register("inverted_sign", () -> InvertedSignLevelBasedValue.CODEC);
```

## 自定义战利品条件

首先创建实现 `LootItemCondition` 的战利品 Item 条件类。作为示例，假设我们只想在击杀生物的玩家达到特定经验等级时让条件通过：

```java
public record HasXpLevelCondition(int level) implements LootItemCondition {
    // Add the context we need for this condition. In our case, this will be the xp level the player must have.
    public static final MapCodec<HasXpLevelCondition> CODEC = RecordCodecBuilder.mapCodec(inst -> inst.group(
            Codec.INT.fieldOf("level").forGetter(HasXpLevelCondition::level)
    ).apply(inst, HasXpLevelCondition::new));
    
    // Evaluates the condition here. Get the required loot context parameters from the provided LootContext.
    // In our case, we want the KILLER_ENTITY to have at least our required level.
    @Override
    public boolean test(LootContext context) {
        @Nullable
        Entity entity = context.getOptionalParameter(LootContextParams.KILLER_ENTITY);
        return entity instanceof Player player && player.experienceLevel >= level; 
    }
    
    // Tell the game what parameters we expect from the loot context. Used in validation.
    @Override
    public Set<ContextKey<?>> getReferencedContextParams() {
        return ImmutableSet.of(LootContextParams.KILLER_ENTITY);
    }

    // Tells the condition what to use for serialization.
    @Override
    public MapCodec<HasXpLevelCondition> codec() {
        return CODEC;
    }
}
```

可以将该映射 codec [注册][registries]到 Registry：

```java
public static final DeferredRegister<MapCodec<? extends LootItemCondition>> LOOT_CONDITION_TYPES =
        DeferredRegister.create(Registries.LOOT_CONDITION_TYPE, ExampleMod.MOD_ID);

public static final Supplier<MapCodec<HasXpLevelCondition>> MIN_XP_LEVEL =
        LOOT_CONDITION_TYPES.register("min_xp_level", () -> HasXpLevelCondition.CODEC);
```

## 自定义战利品函数

首先创建一个扩展 `LootItemFunction` 的自定义类。`LootItemFunction` 扩展了 `BiFunction<ItemStack, LootContext, ItemStack>`，因此我们的目标是使用现有 ItemStack 与战利品上下文，返回一个经过修改的新 ItemStack。不过，几乎所有战利品函数都不会直接扩展 `LootItemFunction`，而是改为扩展 `LootItemConditionalFunction`。该类内置了将战利品条件应用到函数的功能——只有战利品条件成立时才会应用函数。作为示例，我们为 Item 应用一个具有指定等级的随机附魔：

```java
// Code adapted from vanilla's EnchantRandomlyFunction class.
// LootItemConditionalFunction is an abstract class, not an interface, so we cannot use a record here.
public class RandomEnchantmentWithLevelFunction extends LootItemConditionalFunction {
    // Our context: an optional list of enchantments, and a level.
    private final Optional<HolderSet<Enchantment>> enchantments;
    private final int level;
    // Our codec.
    public static final MapCodec<RandomEnchantmentWithLevelFunction> CODEC =
            // #commonFields adds the conditions field.
            RecordCodecBuilder.mapCodec(inst -> commonFields(inst).and(inst.group(
                    RegistryCodecs.homogeneousList(Registries.ENCHANTMENT).optionalFieldOf("enchantments").forGetter(e -> e.enchantments),
                    Codec.INT.fieldOf("level").forGetter(e -> e.level)
            ).apply(inst, RandomEnchantmentWithLevelFunction::new));
    
    public RandomEnchantmentWithLevelFunction(List<LootItemCondition> conditions, Optional<HolderSet<Enchantment>> enchantments, int level) {
        super(conditions);
        this.enchantments = enchantments;
        this.level = level;
    }
    
    // Run our enchantment application logic. Most of this is copied from EnchantRandomlyFunction#run.
    @Override
    public ItemStack run(ItemStack stack, LootContext context) {
        RandomSource random = context.getRandom();
        List<Holder<Enchantment>> stream = this.enchantments
                .map(HolderSet::stream)
                .orElseGet(() -> context.getLevel().registryAccess().lookupOrThrow(Registries.ENCHANTMENT).listElements().map(Function.identity()))
                .filter(e -> e.value().canEnchant(stack))
                .toList();
        Optional<Holder<Enchantment>> optional = Util.getRandomSafe(list, random);
        if (optional.isEmpty()) {
            LOGGER.warn("Couldn't find a compatible enchantment for {}", stack);
        } else {
            Holder<Enchantment> enchantment = optional.get();
            if (stack.is(Items.BOOK)) {
                stack = new ItemStack(Items.ENCHANTED_BOOK);
            }
            stack.enchant(enchantment, Mth.nextInt(random, enchantment.value().getMinLevel(), enchantment.value().getMaxLevel()));
        }
        return stack;
    }

    // Tells the function what to use for serialization.
    @Override
    public MapCodec<RandomEnchantmentWithLevelFunction> codec() {
        return CODEC;
    }
}
```

随后可以将该映射 codec [注册][registries]到 Registry：

```java
public static final DeferredRegister<MapCodec<? extends LootItemFunction>> LOOT_FUNCTION_TYPES =
        DeferredRegister.create(Registries.LOOT_FUNCTION_TYPE, ExampleMod.MOD_ID);

public static final Supplier<MapCodec<RandomEnchantmentWithLevelFunction>> RANDOM_ENCHANTMENT_WITH_LEVEL =
        LOOT_FUNCTION_TYPES.register("random_enchantment_with_level", () -> RandomEnchantmentWithLevelFunction.CODEC);
```

[codec]: ../../../datastorage/codecs.md
[entity]: ../../../entities/index.md
[registries]: ../../../concepts/registries.md#methods-for-registering
