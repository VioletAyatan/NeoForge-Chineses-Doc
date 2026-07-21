# 按键映射（Key Mappings）

按键映射（key mapping，也称 key binding）把特定操作与某种输入关联起来，例如鼠标单击、按键按下等。只要客户端能够接收输入，就可以检查按键映射所定义的每项操作。此外，用户还可以通过[控制选项菜单][controls]把每个按键映射分配给任意输入。

## 注册 `KeyMapping`

仅在物理客户端上监听[模组事件总线][eventbus]的 `RegisterKeyMappingsEvent`，并调用 `#register`，即可注册 `KeyMapping`。

```java
// In some physical client only class

// Key mapping is lazily initialized so it doesn't exist until it is registered
public static final Lazy<KeyMapping> EXAMPLE_MAPPING = Lazy.of(() -> /*...*/);

@SubscribeEvent // on the mod event bus only on the physical client
public static void registerBindings(RegisterKeyMappingsEvent event) {
    event.register(EXAMPLE_MAPPING.get());
}
```

## 创建 `KeyMapping`

可以通过构造器创建 `KeyMapping`。`KeyMapping` 构造器接收定义映射名称的[翻译键][tk]、映射的默认输入，以及一个 `KeyMapping.Category`；后者决定映射在[控制选项菜单][controls]中所属的类别。

:::tip
可以用 `Identifier` 创建新的 `KeyMapping.Category`，再仅在[物理客户端][sides]通过[模组事件总线][eventbus]上的 `RegisterKeyMappingsEvent#registerCategory` 注册，将 `KeyMapping` 加入自定义类别。该类别对应的[翻译键][tk]为 `key.category.<namespace>.<path>`。

```java
public static final KeyMapping.Category EXAMPLE_CATEGORY = new KeyMapping.Category(Identifier.fromNamespaceAndPath("examplemod", "category"));

@SubscribeEvent // on the mod event bus only on the physical client
public static void registerBindings(RegisterKeyMappingsEvent event) {
    // Register category
    event.registerCategory(EXAMPLE_CATEGORY);

    // Register binding with category used
    event.register(EXAMPLE_MAPPING.get());
}
```

:::

### 默认输入

每个按键映射都有一个关联的默认输入，通过 `InputConstants.Key` 提供。每项输入由两部分组成：定义输入设备的 `InputConstants.Type`，以及表示该设备上对应输入标识符的 integer。

原版提供三种输入类型：`KEYSYM` 使用所提供的 `GLFW` 按键 token 定义键盘；`SCANCODE` 使用平台特定的 scancode 定义键盘；`MOUSE` 定义鼠标。

:::info
对于键盘，强烈建议使用 `KEYSYM` 而非 `SCANCODE`，因为 `GLFW` 按键 token 不绑定到特定系统。更多信息请参阅 [GLFW 文档][keyinput]。
:::

integer 的含义取决于所提供的类型。所有输入码都在 `GLFW` 中定义：`KEYSYM` token 以 `GLFW_KEY_*` 为前缀，`MOUSE` 输入码以 `GLFW_MOUSE_*` 为前缀。

```java
new KeyMapping(
    "key.examplemod.example1", // Will be localized using this translation key
    InputConstants.Type.KEYSYM, // Default mapping is on the keyboard
    GLFW.GLFW_KEY_P, // Default key is P
    KeyMapping.Category.MISC // Mapping will be in the misc category
)
```

:::info
如果按键映射不应具有默认映射，应把输入设置为 `InputConstants#UNKNOWN`。使用原版构造器时，需要通过 `InputConstants$Key#getValue` 取出输入码；使用 NeoForge 构造器时，则可以直接提供原始输入字段。
:::

### `IKeyConflictContext`

并非所有映射都会在每种上下文中使用。有些映射仅用于 GUI，另一些则只在游戏中使用。为了避免不同上下文中使用同一按键的映射相互冲突，可以为映射分配 `IKeyConflictContext`。

每个冲突上下文包含两个方法：`#isActive` 定义当前游戏状态下是否可以使用映射；`#conflicts` 定义该映射是否与相同或不同冲突上下文中的按键冲突。

目前，NeoForge 通过 `KeyConflictContext` 定义三种基本上下文：`UNIVERSAL` 是默认值，表示按键可以在任何上下文使用；`GUI` 表示仅当 `Screen` 打开时才能使用映射；`IN_GAME` 表示仅当没有打开 `Screen` 时才能使用映射。实现 `IKeyConflictContext` 即可创建新的冲突上下文。

```java
new KeyMapping(
    "key.examplemod.example2",
    KeyConflictContext.GUI, // Mapping can only be used when a screen is open
    InputConstants.Type.MOUSE, // Default mapping is on the mouse
    GLFW.GLFW_MOUSE_BUTTON_LEFT, // Default mouse input is the left mouse button
    EXAMPLE_CATEGORY // Mapping will be in the new example category
)
```

### `KeyModifier`

模组开发者可能不希望按住修饰键时映射仍具有相同行为，例如 `G` 与 `CTRL + G` 应执行不同操作。为此，NeoForge 为构造器添加了一个 `KeyModifier` 参数，可以把 control（`KeyModifier#CONTROL`）、shift（`KeyModifier#SHIFT`）或 alt（`KeyModifier#ALT`）应用到任意输入。默认值 `KeyModifier#NONE` 不应用修饰键。

在[控制选项菜单][controls]中同时按住修饰键和对应输入，即可添加修饰键。

```java
new KeyMapping(
    "key.examplemod.example3",
    KeyConflictContext.UNIVERSAL,
    KeyModifier.SHIFT, // Default mapping requires shift to be held down
    InputConstants.Type.KEYSYM, // Default mapping is on the keyboard
    GLFW.GLFW_KEY_G, // Default key is G
    KeyMapping.Category.MISC
)
```

## 检查 `KeyMapping`

可以检查 `KeyMapping` 是否已被触发。根据检查时机，可以在条件语句中使用映射并执行关联逻辑。

### 在游戏中

在游戏中，应监听[事件总线][eventbus]上的 `ClientTickEvent.Post`，并在 while 循环中检查 `KeyMapping#consumeClick`。`#consumeClick` 只会在输入实际发生且此前尚未处理的次数内返回 `true`，因此不会无限阻塞游戏。

```java
@SubscribeEvent // on the game event bus only on the physical client
public static void onClientTick(ClientTickEvent.Post event) {
    while (EXAMPLE_MAPPING.get().consumeClick()) {
        // Execute logic to perform on click here
    }
}
```

:::warning
不要使用 `InputEvent` 替代 `ClientTickEvent.Post`。目前只有分别处理键盘和鼠标输入的事件，无法处理任何额外输入。
:::

### 在 GUI 内

在 GUI 内，可以在某个 `GuiEventListener` 方法中使用 `IKeyMappingExtension#isActiveAndMatches` 检查映射。最常用的检查方法是 `#keyPressed` 和 `#mouseClicked`。

`#keyPressed` 接收一个 `KeyEvent`，其中包含 `GLFW` 按键 token、平台特定的 scan code，以及表示当前按住修饰键的 bitfield。调用 `InputConstants#getKey` 创建输入，即可对照映射检查按键。映射方法本身已经负责检查修饰键。

```java
// In some Screen subclass
@Override
public boolean keyPressed(KeyEvent event) {
    if (EXAMPLE_MAPPING.get().isActiveAndMatches(InputConstants.getKey(event))) {
        // Execute logic to perform on key press here
        return true;
    }
    return super.keyPressed(event);
} 
```

:::info
如果需要检查**按键**的 `Screen` 不属于你，可以改为监听[游戏事件总线][eventbus]上的 `ScreenEvent.KeyPressed` 的 `Pre` 或 `Post` 事件。
:::

`#mouseClicked` 接收一个 `MouseButtonEvent`，其中包含鼠标的 x、y 位置以及被单击的 `MouseButtonInfo`；此外还接收一个表示用户是否双击的 `boolean`。使用 `MOUSE` 输入调用 `InputConstants.Type#getOrCreate` 创建输入，即可对照映射检查鼠标按钮。

```java
// In some Screen subclass
@Override
public boolean mouseClicked(MouseButtonEvent event, boolean doubleClick) {
    if (EXAMPLE_MAPPING.get().isActiveAndMatches(InputConstants.Type.MOUSE.getOrCreate(event.button()))) {
        // Execute logic to perform on mouse click here
        return true;
    }
    return super.mouseClicked(event, doubleClick);
} 
```

:::info
如果需要检查**鼠标**的 `Screen` 不属于你，可以改为监听[游戏事件总线][eventbus]上的 `ScreenEvent.MouseButtonPressed` 的 `Pre` 或 `Post` 事件。
:::

[eventbus]: ../concepts/events.md#注册事件处理器
[controls]: https://minecraft.wiki/w/Options#Controls
[tk]: ../resources/client/i18n.md#components
[keyinput]: https://www.glfw.org/docs/3.3/input_guide.html#input_key
[sides]: ../concepts/sides.md#the-physical-side
