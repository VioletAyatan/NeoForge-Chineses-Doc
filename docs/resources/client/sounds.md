# 音效（Sounds）

音效虽然不是必需的，却能让模组显得更加细腻和生动。Minecraft 提供了多种注册和播放音效的方式，本文将逐一介绍。

## 术语

Minecraft 音效引擎会用多种术语指代不同概念：

- **音效事件（Sound Event）**：音效事件是代码中的触发器，用于通知音效引擎播放特定音效。`SoundEvent` 同时也是要注册到游戏中的对象。
- **音效类别（Sound Category）或音效来源（Sound Source）**：音效类别是对音效的粗略分组，可单独开关。音效选项界面中的滑块就代表这些类别，例如 `master`、`block`、`player` 等。代码中可在 `SoundSource` 枚举里找到它们。
- **音效定义（Sound Definition）**：音效事件到一个或多个音效对象的映射，以及一些可选元数据。音效定义位于某个命名空间的 [`sounds.json` 文件][soundsjson]中。
- **音效对象（Sound Object）**：由音效文件位置和一些可选元数据组成的 JSON 对象。
- **音效文件（Sound File）**：磁盘上的音效文件。Minecraft 只支持 `.ogg` 音效文件。

:::danger
受 OpenAL（Minecraft 的音频库）实现方式影响，如果希望音效具有衰减效果——也就是让音量随玩家与音源的距离远近而变大或变小——音效文件必须是单声道。立体声（多声道）音效文件不会衰减，并始终在玩家所在位置播放，因此非常适合环境音效和背景音乐。另请参阅 [MC-146721][bug]。
:::

## 创建 `SoundEvent`

`SoundEvent` 是[注册对象][registration]，这意味着必须通过 `DeferredRegister` 注册到游戏，并且应为单例：

```java
public class MySoundsClass {
    // 假设你的模组 ID 是 examplemod
    public static final DeferredRegister<SoundEvent> SOUND_EVENTS =
            DeferredRegister.create(BuiltInRegistries.SOUND_EVENT, "examplemod");
    
    // 所有原版音效都使用可变范围事件。
    public static final Holder<SoundEvent> MY_SOUND = SOUND_EVENTS.register(
            "my_sound",
            // 接收注册名。
            SoundEvent::createVariableRangeEvent
    );
    
    // 也有一个当前未使用的方法，可用于注册固定范围（即不衰减）事件：
    public static final Holder<SoundEvent> MY_FIXED_SOUND = SOUND_EVENTS.register(
            "my_fixed_sound",
            // 16 是默认的音效范围。请注意，由于 OpenAL 的限制，
            // 高于 16 的值不会生效，并会被限制为 16。
            registryName -> SoundEvent.createFixedRangeEvent(registryName, 16f)
    );
}
```

当然，不要忘记在[模组构造器][modctor]中把你的注册表添加到[模组事件总线][modbus]：

```java
public ExampleMod(IEventBus modBus) {
    MySoundsClass.SOUND_EVENTS.register(modBus);
    // 这里还有其他东西
}
```

至此，一个音效事件就创建完成了！

## `sounds.json`

_另请参阅：[Minecraft Wiki][mcwiki] 上的 [sounds.json][mcwikisounds]_

现在，要把音效事件与实际音效文件连接起来，需要创建音效定义。某个命名空间的所有音效定义都保存在一个名为 `sounds.json` 的文件中，该文件也称为音效定义文件，直接位于命名空间根目录。每个音效定义都是从音效事件 ID（例如 `my_sound`）到 JSON 音效对象的映射。请注意，音效事件 ID 不指定命名空间，因为命名空间已经由音效定义文件所在位置决定。`sounds.json` 示例如下：

```json5
{
    // 音效事件 "examplemod:my_sound" 的音效定义。
    "my_sound": {
        // 音效对象列表。如果包含多个元素，将随机选择一个。
        "sounds": [
            // 只有名称是必需的，所有其他属性都是可选的。
            {
                // 音效文件的位置，相对于命名空间下的 `sounds` 文件夹。
                // 此示例引用 assets/examplemod/sounds/sound_1.ogg 处的音效。
                "name": "examplemod:sound_1",
                // 可以是 "sound" 或 "event"。"sound" 表示名称引用音效文件。
                // "event" 表示名称引用另一个音效事件。默认为 "sound"。
                "type": "sound",
                // 播放此音效时使用的音量。必须介于 0.0 和 1.0（默认值）之间。
                "volume": 0.8,
                // 播放音效的音高值。
                // 必须介于 0.0 和 2.0 之间。默认为 1.0。
                "pitch": 1.1,
                // 从音效列表中选择音效时，该音效的权重。默认为 1。
                "weight": 3,
                // 如果是 true，音效将从文件中流式传输，而不是一次全部加载。
                // 建议用于时长超过几秒的音效文件。默认为 false。
                "stream": true,
                // 手动衰减距离。默认为 16。被固定范围音效事件忽略。
                "attenuation_distance": 8,
                // 如果是 true，则音效将在包加载时加载到内存中，而不是在播放音效时加载到内存中。
                // 原版使用该选项实现水下环境音效。默认为 false。
                "preload": true
            },
            // { "name": "examplemod:sound_2" } 的快捷方式
            "examplemod:sound_2"
        ]
    },
    "my_fixed_sound": {
        // 可选。如果是 true，则替换其他资源包中的音效而不是添加到其中。
        // 有关详细信息，请参阅下面的“合并”章节。
        "replace": true,
        // 此音效事件触发时显示的字幕翻译键。
        "subtitle": "examplemod.my_fixed_sound",
        "sounds": [
            "examplemod:sound_1",
            "examplemod:sound_2"
        ]
    }
}
```

### 合并

与大多数其他资源文件不同，`sounds.json` 不会覆盖其下方包中的值，而是会先合并，再作为一个组合后的 `sounds.json` 文件解释。假设音效 `sound_1`、`sound_2`、`sound_3` 和 `sound_4` 分别定义在资源包 RP1 和 RP2 的两个 `sounds.json` 文件中，其中 RP2 位于 RP1 下方：

RP1 中的 `sounds.json`：

```json5
{
    "sound_1": {
        "sounds": [
            "sound_1"
        ]
    },
    "sound_2": {
        "replace": true,
        "sounds": [
            "sound_2"
        ]
    },
    "sound_3": {
        "sounds": [
            "sound_3"
        ]
    },
    "sound_4": {
        "replace": true,
        "sounds": [
            "sound_4"
        ]
    }
}
```

RP2 中的 `sounds.json`：

```json5
{
    "sound_1": {
        "sounds": [
            "sound_5"
        ]
    },
    "sound_2": {
        "sounds": [
            "sound_6"
        ]
    },
    "sound_3": {
        "replace": true,
        "sounds": [
            "sound_7"
        ]
    },
    "sound_4": {
        "replace": true,
        "sounds": [
            "sound_8"
        ]
    }
}
```

随后，游戏实际用于加载音效的合并 `sounds.json` 文件如下（仅存在于内存中，不会写入任何位置）：

```json5
{
    "sound_1": {
        // `replace` 均为 false：先添加下层包，再添加上层包
        "sounds": [
            "sound_5",
            "sound_1"
        ]
    },
    "sound_2": {
        // 上层包中 `replace` 为 true，下层包中为 false：仅添加上层包
        "sounds": [
            "sound_2"
        ]
    },
    "sound_3": {
        // 上层包中 `replace` 为 false，下层包中为 true：先添加下层包，再添加上层包
        // 仍会丢弃位于 RP2 下方的第三个资源包中的值
        "sounds": [
            "sound_7",
            "sound_3"
        ]
    },
    "sound_4": {
        // `replace` 均为 true：仅添加上层包
        "sounds": [
            "sound_8"
        ]
    }
}
```

## 播放音效

Minecraft 提供了多种播放音效的方法，有时并不容易判断应使用哪一种。所有方法都接收 `SoundEvent`，它可以是你自己的，也可以是原版的（原版音效事件位于 `SoundEvents` 类中）。在以下方法说明中，客户端和服务端分别指[逻辑客户端与逻辑服务端][sides]。

### `Level`

- `playSeededSound(Entity entity, double x, double y, double z, Holder<SoundEvent> soundEvent, SoundSource soundSource, float volume, float pitch, long seed)`
  - 客户端行为：如果传入的玩家是 `Local Player`，就在给定位置为该玩家播放音效事件；否则不执行操作。
  - 服务端行为：向除传入玩家之外的所有玩家发送数据包，指示对应客户端在给定位置播放音效事件。
  - 用法：从会在两端运行、由客户端发起的代码中调用。服务端不会再向发起玩家播放它，从而避免该玩家听到两次。也可以从服务端发起的代码（例如 [BlockEntity][be]）中传入 `null` 玩家，让所有人听到音效。
- `playSound(Entity entity, double x, double y, double z, SoundEvent soundEvent, SoundSource soundSource, float volume, float pitch)`
  - 选择一个随机 seed，并把 `SoundEvent` 包装为 `Holder` 后转发到 `playSeededSound`。
- `playSound(Entity entity, BlockPos pos, SoundEvent soundEvent, SoundSource soundSource, float volume, float pitch)`
  - 转发到上述方法，其中 `x`、`y`、`z` 分别取 `pos.getX() + 0.5`、`pos.getY() + 0.5`、`pos.getZ() + 0.5` 的值。
- `playLocalSound(double x, double y, double z, SoundEvent soundEvent, SoundSource soundSource, float volume, float pitch, boolean distanceDelay)`
  - 客户端行为：在给定位置向玩家播放音效。不向服务端发送任何内容。如果 `distanceDelay` 为 `true`，会根据到玩家的距离延迟音效。
  - 服务端行为：不执行操作。
  - 用法：从服务端发送的自定义数据包中调用。原版将其用于打雷音效。
- `playPlayerSound(SoundEvent soundEvent, SoundSource soundSource, float volume, float pitch)`
  - 客户端行为：播放绑定到玩家位置的音效。不向服务端发送任何内容。
  - 服务端行为：不执行操作。
  - 用法：原版将其用于方块环境音效。

### `ClientLevel`

- `playLocalSound(BlockPos pos, SoundEvent soundEvent, SoundSource soundSource, float volume, float pitch, boolean distanceDelay)`
  - 转发到 `Level#playLocalSound`，其中 `x`、`y`、`z` 分别取 `pos.getX() + 0.5`、`pos.getY() + 0.5`、`pos.getZ() + 0.5` 的值。

### `Entity`

- `playSound(SoundEvent soundEvent, float volume, float pitch)`
  - 转发到 `Level#playSound`：玩家参数为 `null`，音效来源为 `Entity#getSoundSource`，x/y/z 使用实体位置，并传入其他参数。

### `Player`

- `playSound(SoundEvent soundEvent, float volume, float pitch)`（重写 `Entity` 中的方法）
  - 转发到 `Level#playSound`：玩家参数为 `this`，音效来源为 `SoundSource.PLAYER`，x/y/z 使用玩家位置，并传入其他参数。因此，客户端/服务端行为与 `Level#playSound` 相同：
    - 客户端行为：在给定位置向客户端玩家播放音效事件。
    - 服务端行为：向给定位置附近除调用该方法的玩家以外的所有人播放音效事件。

## 数据生成

音效文件本身当然无法由[数据生成][datagen]直接生成，但 `sounds.json` 文件可以。为此，请扩展 `SoundDefinitionsProvider` 并重写 `registerSounds()` 方法：

```java
public class MySoundDefinitionsProvider extends SoundDefinitionsProvider {
    // 参数可从 `GatherDataEvent.Client` 获取。
    public MySoundDefinitionsProvider(PackOutput output) {
        // 使用你的实际模组 ID 而不是 "examplemod"。
        super(output, "examplemod");
    }

    @Override
    public void registerSounds() {
        // 第一个参数可以接受 `Holder<SoundEvent>`、`SoundEvent` 或 `Identifier`。
        add(MySoundsClass.MY_SOUND, SoundDefinition.definition()
            // 将音效对象添加到音效定义中。该参数是可变参数。
            .with(
                // 第一个参数接受字符串或 `Identifier`。
                // 第二个参数可以是 `SOUND` 或 `EVENT`；若使用前者，可省略该参数。
                sound("examplemod:sound_1", SoundDefinition.SoundType.SOUND)
                    // 设置音量。也有对应的 double 重载。
                    .volume(0.8f)
                    // 设置音高。也有对应的 double 重载。
                    .pitch(1.2f)
                    // 设置权重。
                    .weight(2)
                    // 设置衰减距离。
                    .attenuationDistance(8)
                    // 启用流式传输。
                    // 还有一个无参数重载，等价于调用 `stream(true)`。
                    .stream(true)
                    // 启用预加载。
                    // 还有一个无参数重载，等价于调用 `preload(true)`。
                    .preload(true),
                // 这是能写出的最短形式。
                sound("examplemod:sound_2")
            )
            // 设置字幕。
            .subtitle("sound.examplemod.sound_1")
            // 启用替换。
            .replace(true)
        );
    }
}
```

和其他数据提供器一样，不要忘记把提供器注册到该事件：

```java
@SubscribeEvent // 位于模组事件总线上
public static void gatherData(GatherDataEvent.Client event) {
    event.createProvider(MySoundDefinitionsProvider::new);
}
```

[bug]: https://bugs.mojang.com/browse/MC-146721
[datagen]: ../index.md#数据生成
[mcwiki]: https://minecraft.wiki
[mcwikisounds]: https://minecraft.wiki/w/Sounds.json
[modbus]: ../../concepts/events.md#事件总线
[modctor]: ../../gettingstarted/modfiles.md#javafml-and-mod
[registration]: ../../concepts/registries.md
[sides]: ../../concepts/sides.md#the-logical-side
[soundsjson]: #soundsjson
