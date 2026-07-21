# 可扩展枚举（Extensible Enums）

可扩展枚举是对特定原版枚举的增强，允许向其中添加新条目。其实现方式是在运行时修改枚举已编译的字节码，从而加入新元素。

## `IExtensibleEnum`

所有可以添加新条目的枚举都实现了 `IExtensibleEnum` 接口。该接口起到标记作用，使 `RuntimeEnumExtender` 启动插件服务能够识别应转换哪些枚举。

:::warning
你**不应**让自己的枚举实现此接口。请根据用例改用 Map 或 Registry。
由于各转换器的执行顺序，没有经过补丁以实现该接口的枚举，无法通过 Mixin 或 Coremod 添加这个接口。
:::

### 创建枚举条目

要创建新的枚举条目，需要创建一个 JSON 文件，并在 `neoforge.mods.toml` 的 `[[mods]]` 块中通过 `enumExtensions` 条目引用它。指定路径必须相对于 `resources` 目录：

```toml
# In neoforge.mods.toml:
[[mods]]
## The file is relative to the output directory of the resources, or the root path inside the jar when compiled
## The 'resources' directory represents the root output directory of the resources
enumExtensions="META-INF/enumextensions.json"
```

条目定义由目标枚举的类名、新字段名称（必须以模组 ID 为前缀）、用于构造条目的构造器描述符，以及要传给该构造器的参数组成。

```json5
{
    "entries": [
        {
            // The enum class the entry should be added to
            "enum": "net/minecraft/world/item/ItemDisplayContext",
            // The field name of the new entry, must be prefixed with the mod ID
            "name": "EXAMPLEMOD_STANDING",
            // The constructor to be used
            "constructor": "(ILjava/lang/String;Ljava/lang/String;)V",
            // Constant parameters provided directly.
            "parameters": [ -1, "examplemod:standing", null ]
        },
        {
            "enum": "net/minecraft/world/item/Rarity",
            "name": "EXAMPLEMOD_CUSTOM",
            "constructor": "(ILjava/lang/String;Ljava/util/function/UnaryOperator;)V",
            // The parameters to be used, provided as a reference to an EnumProxy<Rarity> field in the given class
            "parameters": {
                "class": "example/examplemod/MyEnumParams",
                "field": "CUSTOM_RARITY_ENUM_PROXY"
            }
        },
        {
            "enum": "net/minecraft/world/damagesource/DamageEffects",
            "name": "EXAMPLEMOD_TEST",
            "constructor": "(Ljava/lang/String;Ljava/util/function/Supplier;)V",
            // The parameters to be used, provided as a reference to a method in the given class
            "parameters": {
                "class": "example/examplemod/MyEnumParams",
                "method": "getTestDamageEffectsParameter"
            }
        }
    ]
}
```

```java
public class MyEnumParams {
    public static final EnumProxy<Rarity> CUSTOM_RARITY_ENUM_PROXY = new EnumProxy<>(
            Rarity.class, -1, "examplemod:custom", (UnaryOperator<Style>) style -> style.withItalic(true)
    );
    
    public static Object getTestDamageEffectsParameter(int idx, Class<?> type) {
        return type.cast(switch (idx) {
            case 0 -> "examplemod:test";
            case 1 -> (Supplier<SoundEvent>) () -> SoundEvents.DONKEY_ANGRY;
            default -> throw new IllegalArgumentException("Unexpected parameter index: " + idx);
        });
    }
}
```

#### 构造器

构造器必须以[方法描述符][jvmdescriptors]形式指定，并且只能包含源代码中可见的参数，省略隐藏的常量名称和 ordinal 参数。  
如果某个构造器带有 `@ReservedConstructor` 注解，则不能使用它构造模组枚举常量。

#### 参数

参数可以通过三种方式指定；每种方式会根据参数类型受到不同限制：

- 直接以内联常量数组形式写入 JSON 文件（只允许 primitive 值、String，以及向任何引用类型传递 null）
- 引用模组中某个类的 `EnumProxy<TheEnum>` 类型字段（参见上面的 `EnumProxy` 示例）
    - 第一个参数指定目标枚举，后续参数则会传给枚举构造器
- 引用返回 `Object` 的方法，以其返回值作为所用参数值。该方法必须恰好拥有两个参数，类型分别为 `int`（参数索引）和 `Class<?>`（参数的预期类型）
    - 应使用 `Class<?>` 对象对返回值进行类型转换（`Class#cast()`），从而让 `ClassCastException` 保留在模组代码中。

:::warning
用作参数值来源的字段和/或方法应放在单独的类中，以免过早意外加载模组类。
:::

某些参数还有附加规则：

- 如果参数是与枚举上 `@IndexedEnum` 注解相关的 int ID 参数，则会忽略该参数，并以条目的 ordinal 替代。如果该参数以内联方式写在 JSON 中，就必须指定为 `-1`，否则会抛出异常。
- 如果参数是与枚举上 `@NamedEnum` 注解相关的 String 名称参数，就必须按照 `Identifier` 所使用的 `namespace:path` 格式，以模组 ID 作为前缀，否则会抛出异常。

#### 获取生成的常量

可以通过 `TheEnum.valueOf(String)` 获取生成的枚举常量。如果使用字段引用提供参数，也可以通过 `EnumProxy#getValue()` 从 `EnumProxy` 对象获取该常量。

## 为 NeoForge 做贡献

要向 NeoForge 添加新的可扩展枚举，至少需要完成以下两项工作：

- 让枚举实现 `IExtensibleEnum`，以标记应由 `RuntimeEnumExtender` 转换此枚举。
- 添加一个返回 `ExtensionInfo.nonExtended(TheEnum.class)` 的 `getExtensionInfo` 方法。

根据枚举的具体情况，还需要采取其他措施：

- 如果枚举有一个应与条目 ordinal 相匹配的 int ID 参数，则应使用 `@IndexedEnum` 为枚举添加注解；如果 ID 不是第一个参数，还需以 ID 参数的索引作为注解值
- 如果枚举有一个用于序列化、因此应带有命名空间的 String 名称参数，则应使用 `@NamedEnum` 为枚举添加注解；如果名称不是第一个参数，还需以名称参数的索引作为注解值
- 如果枚举会通过网络发送，则应添加 `@NetworkedEnum` 注解，并通过注解参数指定允许在哪个方向发送值（clientbound、serverbound 或 bidirectional）
- 如果枚举中存在模组无法使用的构造器（例如它们要求提供 Registry 对象，而该枚举可能在模组注册开始前就已初始化），就应为这些构造器添加 `@ReservedConstructor` 注解

:::info
如果确实有任何条目被添加到枚举中，`getExtensionInfo` 方法会在运行时经过转换，提供动态生成的 `ExtensionInfo`。
:::

```java
// This is an example, not an actual enum within Vanilla

// The first argument must match the enum constant's ordinal
@net.neoforged.fml.common.asm.enumextension.IndexedEnum
// The second argument is a string that must be prefixed with the mod id
@net.neoforged.fml.common.asm.enumextension.NamedEnum(1)
// This enum is used in networking and must be checked for mismatches between the client and server
@net.neoforged.fml.common.asm.enumextension.NetworkedEnum(net.neoforged.fml.common.asm.enumextension.NetworkedEnum.NetworkCheck.BIDIRECTIONAL)
public enum ExampleEnum implements net.neoforged.fml.common.asm.enumextension.IExtensibleEnum {
    // VALUE_1 represents the name parameter here
    VALUE_1(0, "value_1", false),
    VALUE_2(1, "value_2", true),
    VALUE_3(2, "value_3");

    ExampleEnum(int arg1, String arg2, boolean arg3) {
        // ...
    }

    ExampleEnum(int arg1, String arg2) {
        this(arg1, arg2, false);
    }

    public static net.neoforged.fml.common.asm.enumextension.ExtensionInfo getExtensionInfo() {
        return net.neoforged.fml.common.asm.enumextension.ExtensionInfo.nonExtended(ExampleEnum.class);
    }
}
```

[jvmdescriptors]: https://docs.oracle.com/javase/specs/jvms/se21/html/jvms-4.html#jvms-4.3.2

