# 访问转换器（Access Transformer）

Access Transformer（简称 AT）可以扩大类、方法和字段的可见性，并修改它们的 `final` 标记。借助 AT，模组开发者可以访问和修改原本无法访问、且不受自己控制的类成员。

可在 NeoForged GitHub 上查看[规范文档][specs]。

## 添加 AT

要向模组项目添加 Access Transformer，只需在 `build.gradle` 中添加一行配置。

Access Transformer 必须在 `build.gradle` 中声明。AT 文件可以放在任何位置，只要编译时会将其复制到 `resources` 输出目录即可。

<Tabs defaultValue="mdg">
<TabItem value="mdg" label="ModDevGradle">

默认情况下无需在这里进行任何操作！

</TabItem>
<TabItem value="ng" label="NeoGradle">

```gradle
// 在 build.gradle 中：
minecraft {
    accessTransformers {
        file 'src/main/resources/META-INF/accesstransformer.cfg'
    }
}
```

</TabItem>
</Tabs>

默认情况下，NeoForge 会查找 `META-INF/accesstransformer.cfg`。如果 `build.gradle` 指定了其他位置的 Access Transformer，就需要在 `neoforge.mods.toml` 中定义其位置：

```toml
# 在 neoforge.mods.toml 中：
[[accessTransformers]]
## 该文件相对于资源的输出目录，或者编译时jar内的根路径
## 'resources' 目录代表资源的根输出目录
file="META-INF/accesstransformer.cfg"
```

此外，还可以指定多个 AT 文件，它们会按顺序应用。对于包含多个包的大型模组，这会很有用。

<Tabs defaultValue="mdg">
<TabItem value="mdg" label="ModDevGradle">

```gradle
// 在 build.gradle 中：
neoForge {
// ModDevGradle 默认已尝试包含 'src/main/resources/META-INF/accesstransformer.cfg'
    accessTransformers.from 'src/additions/resources/accesstransformer_additions.cfg'
}
```

</TabItem>
<TabItem value="ng" label="NeoGradle">

```gradle
// 在 build.gradle 中：
minecraft {
    accessTransformers {
        file 'src/main/resources/META-INF/accesstransformer.cfg'
        file 'src/additions/resources/accesstransformer_additions.cfg'
    }
}
```

</TabItem>
</Tabs>

```toml
# 在 neoforge.mods.toml 中
[[accessTransformers]]
file="accesstransformer.cfg"

[[accessTransformers]]
file="accesstransformer_additions.cfg"
```

添加或修改任何 Access Transformer 后，都必须刷新 Gradle 项目，转换才能生效。

## Access Transformer 规范

### 注释

从 `#` 开始到行尾的所有文本都会被视为注释，不会被解析。

### 访问修饰符

访问修饰符用于指定目标成员转换后的新可见性。按可见性从高到低排列如下：

- `public` - 对包内外的所有类可见
- `protected` - 仅对包内的类和子类可见
- `default` - 仅对包内的类可见
- `private` - 仅在类内部可见

可以在上述修饰符后附加特殊修饰符 `+f` 或 `-f`，分别添加或移除 `final` 修饰符。应用 `final` 后，会阻止继承、方法重写或字段修改。

:::danger
指令只会修改其直接引用的方法；任何重写该方法的方法都不会经过访问转换。建议确保被转换的方法不存在可见性限制更严格、但未被转换的重写方法，否则 JVM 会抛出错误。

可以安全转换的方法示例包括 `final` 方法（或 `final` 类中的方法）以及 `static` 方法。`private` 方法通常也很安全；不过，它们可能会在子类型中造成无意的重写，因此还应额外进行人工验证。
:::

### 目标和指令

#### 类

定位类的格式：

```
<access modifier> <fully qualified class name>
```

内部类使用外部类的完全限定名与内部类名称表示，并以 `$` 作为分隔符。

#### 字段

定位字段的格式：

```
<access modifier> <fully qualified class name> <field name>
```

#### 方法

定位方法需要使用特殊语法来表示方法参数和返回类型：

```
<access modifier> <fully qualified class name> <method name>(<parameter types>)<return type>
```

##### 指定类型

它们也称为“描述符”。更多技术细节请参阅 [Java 虚拟机规范 SE 21 的 4.3.2 和 4.3.3 节][jvmdescriptors]。

- `B` - `byte`，有符号字节
- `C` - `char`，UTF-16 中的 Unicode 字符码位
- `D` - `double`，双精度浮点值
- `F` - `float`，单精度浮点值
- `I` - `integer`，32 位整数
- `J` - `long`，64 位整数
- `S` - `short`，有符号短整数
- `Z` - `boolean`，值为 `true` 或 `false`
- `[` - 表示数组的一个维度
    - 示例：`[[S` 表示 `short[][]`
- `L<class name>;` - 表示引用类型
    - 示例：`Ljava/lang/String;` 表示 `java.lang.String` 引用类型（_注意这里使用斜杠而不是句点_）
- `(` - 表示方法描述符；如果存在参数，应在此处提供，否则留空
    - 示例：`<method>(I)Z` 表示一个接收 integer 参数并返回 boolean 的方法
- `V` - 表示方法不返回值，只能用在方法描述符末尾
    - 示例：`<method>()V` 表示一个无参数且无返回值的方法

### 示例

```
# 将 Crypt 中的 ByteArrayToKeyFunction 接口设为 public
public net.minecraft.util.Crypt$ByteArrayToKeyFunction

# 将 MinecraftServer 中的 'random' 设为 protected，并移除 final 修饰符
protected-f net.minecraft.server.MinecraftServer random

# 将 Util 中的 'makeExecutor' 方法设为 public，
# 该方法接收 String 并返回 TracingExecutor
public net.minecraft.Util makeExecutor(Ljava/lang/String;)Lnet/minecraft/TracingExecutor;

# 将 UUIDUtil 中的 'leastMostToIntArray' 方法设为 public，
# 该方法接收两个 long 并返回 int[]
public net.minecraft.core.UUIDUtil leastMostToIntArray(JJ)[I
```

[specs]: https://github.com/NeoForged/AccessTransformers/blob/main/FMLAT.md
[jvmdescriptors]: https://docs.oracle.com/javase/specs/jvms/se25/html/jvms-4.html#jvms-4.3.2

