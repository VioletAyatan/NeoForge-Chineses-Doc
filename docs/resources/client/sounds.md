# 音效（Sounds）

音效虽然不是必需的，却能让模组显得更加细腻和生动。Minecraft 提供了多种注册和播放声音的方式，本文将逐一介绍。

## 术语

Minecraft 声音引擎使用多种术语表示不同事物：

- **Sound Event**：Sound Event 是代码中的触发器，用于通知声音引擎播放特定声音。`SoundEvent` 也是注册到游戏中的对象。
- **Sound Category** 或 **Sound Source**：Sound Category 是可单独开关的声音粗略分组。声音选项 GUI 中的滑块就代表这些类别，例如 `master`、`block`、`player` 等。代码中可在 `SoundSource` 枚举里找到它们。
- **Sound Definition**：Sound Event 到一个或多个 Sound Object 的映射，以及一些可选 Metadata。Sound Definition 位于某个命名空间的 [`sounds.json` 文件][soundsjson]中。
- **Sound Object**：由声音文件位置和一些可选 Metadata 组成的 JSON 对象。
- **Sound File**：磁盘上的声音文件。Minecraft 只支持 `.ogg` 声音文件。

:::danger
由于 OpenAL（Minecraft 的音频库）的实现方式，如果希望声音具有衰减效果——即根据玩家到声源的距离变大或变小——声音文件必须是单声道。立体声（多声道）声音文件不会衰减，并始终在玩家所在位置播放，因此非常适合环境音和背景音乐。另请参阅 [MC-146721][bug]。
:::

## 创建 `SoundEvent`

`SoundEvent` 是[注册对象][registration]，这意味着必须通过 `DeferredRegister` 注册到游戏，并且应为单例：

```java
public class MySoundsClass {
    // 假设你的模组 ID 是 examplemod
    public static final DeferredRegister<SoundEvent> SOUND_EVENTS =
            DeferredRegister.create(BuiltInRegistries.SOUND_EVENT, "examplemod");
    
    // 所有原版声音都使用可变范围事件。
    public static final Holder<SoundEvent> MY_SOUND = SOUND_EVENTS.register(
            "my_sound",
            // 获取注册表名称
            SoundEvent::createVariableRangeEvent
    );
    
    // There is a currently unused method to register fixed range (= non-attenuating) events as well:
    public static final Holder<SoundEvent> MY_FIXED_SOUND = SOUND_EVENTS.register(
            "my_fixed_sound",
            // 16 是默认的声音范围。请注意，由于 OpenAL 的限制，
            // 值高于 16 无效，将上限为 16。
            registryName -> SoundEvent.createFixedRangeEvent(registryName, 16f)
    );
}
```

当然，不要忘记在[模组构造器][modctor]中把 Registry 添加到[模组事件总线][modbus]：

```java
public ExampleMod(IEventBus modBus) {
    MySoundsClass.SOUND_EVENTS.register(modBus);
    // 这里还有其他东西
}
```

至此，一个 Sound Event 就创建完成了！

## `sounds.json`

_另请参阅：[Minecraft Wiki][mcwiki] 上的 [sounds.json][mcwikisounds]_

现在，要把 Sound Event 与实际声音文件连接起来，需要创建 Sound Definition。某个命名空间的所有 Sound Definition 都保存在一个名为 `sounds.json` 的文件中，该文件也称为 Sound Definition 文件，直接位于命名空间根目录。每个 Sound Definition 都是 Sound Event ID（例如 `my_sound`）到 JSON Sound Object 的映射。请注意，Sound Event ID 不指定命名空间，因为它已经由 Sound Definition 文件所在的命名空间确定。`sounds.json` 示例如下：

```json5
{
    // 声音事件的声音定义 "examplemod:my_sound" 声音对象的
    "my_sound": {
        // 声音对象列表。如果包含多个元素，将随机选择一个。
        "sounds": [
            // 仅名称是必需的，所有其他 property 都是可选的。
            {
                // 声音文件的位置，相对于命名空间的声音文件夹。
                // 此示例引用 assets/examplemod/sounds/sound_1.ogg 处的声音。
                "name": "examplemod:sound_1",
                // 可能是 "sound" 或 "event"。 "sound" 使名称引用声音文件。
                // "event" 使名称引用另一个声音事件。默认为 "sound"。
                "type": "sound",
                // 声音的播放音量为此。必须介于 0.0 和 1.0 之间（默认值）。
                "volume": 0.8,
                // 播放声音的音高值。
                // 必须介于 0.0 和 2.0 之间。默认为 1.0。
                "pitch": 1.1,
                // 从声音列表中选择声音时此声音的权重。默认为 1。
                "weight": 3,
                // 如果是 true，声音将从文件中流式传输，而不是一次全部加载。
                // 建议用于时长超过几秒的声音文件。默认为 false。
                "stream": true,
                // 手动衰减距离。默认为 16。被固定范围声音事件忽略。
                "attenuation_distance": 8,
                // 如果是 true，则声音将在包加载时加载到内存中，而不是在播放声音时加载到内存中。
                // 原版使用此来实现水下环境声音。默认为 false。
                "preload": true
            },
            // { "name": "examplemod:sound_2" } 的快捷方式
            "examplemod:sound_2"
        ]
    },
    "my_fixed_sound": {
        // 可选。如果是 true，则替换其他资源包中的声音而不是添加到其中。
        // 有关详细信息，请参阅下面的“合并”章节。
        "replace": true,
        // 此声音事件触发时显示的字幕翻译键。
        "subtitle": "examplemod.my_fixed_sound",
        "sounds": [
            "examplemod:sound_1",
            "examplemod:sound_2"
        ]
    }
}
```

### 合并

与大多数其他资源文件不同，`sounds.json` 不会覆盖其下方 Pack 中的值，而是先合并，再作为一个组合后的 `sounds.json` 文件解释。假设声音 `sound_1`、`sound_2`、`sound_3` 和 `sound_4` 定义在两个不同 Resource Pack RP1 和 RP2 的两个 `sounds.json` 文件中，其中 RP2 位于 RP1 下方：

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

随后，游戏用于加载声音的组合（合并）`sounds.json` 文件如下（仅存在于内存中，不会写入任何位置）：

```json5
{
    "sound_1": {
        // 替换 false 和 false：从下包添加，然后从上包添加
        "sounds": [
            "sound_5",
            "sound_1"
        ]
    },
    "sound_2": {
        // 替换上包中的 true 和下包中的 false：仅从上包添加
        "sounds": [
            "sound_2"
        ]
    },
    "sound_3": {
        // 替换上包中的 false 和下包中的 true：从下包添加，然后从上包添加
        // 仍会丢弃位于 RP2 下面的第三个资源包中的值
        "sounds": [
            "sound_7",
            "sound_3"
        ]
    },
    "sound_4": {
        // 替换 true 和 true：仅从上层包添加
        "sounds": [
            "sound_8"
        ]
    }
}
```

## 播放声音

Minecraft 提供了多种播放声音的方法，有时并不容易判断应使用哪一种。所有方法都接收 `SoundEvent`，它可以是你自己的，也可以是原版的（原版 Sound Event 位于 `SoundEvents` 类中）。在以下方法说明中，客户端和服务端分别指[逻辑客户端与逻辑服务端][sides]。

### `Level`

- `playSeededSound(Entity entity, double x, double y, double z, Holder<SoundEvent> soundEvent, SoundSource soundSource, float volume, float pitch, long seed)`
    - 客户端行为：如果传入的玩家是本地玩家，就在给定位置向该玩家播放 Sound Event，否则不执行操作。
    - 服务端行为：向除传入玩家之外的所有玩家发送 Packet，指示客户端在给定位置向玩家播放 Sound Event。
    - 用法：从会在两端运行、由客户端发起的代码中调用。服务端不向发起玩家播放，可防止为该玩家播放两次。也可以从服务端发起的代码（例如 [BlockEntity][be]）中传入 `null` 玩家，让所有人听到声音。
- `playSound(Entity entity, double x, double y, double z, SoundEvent soundEvent, SoundSource soundSource, float volume, float pitch)`
    - 选取随机 Seed，并用 Holder 包装 `SoundEvent`，然后转发到 `playSeededSound`。
- `playSound(Entity entity, BlockPos pos, SoundEvent soundEvent, SoundSource soundSource, float volume, float pitch)`
    - 转发到上述方法，其中 `x`、`y`、`z` 分别取 `pos.getX() + 0.5`、`pos.getY() + 0.5`、`pos.getZ() + 0.5` 的值。
- `playLocalSound(double x, double y, double z, SoundEvent soundEvent, SoundSource soundSource, float volume, float pitch, boolean distanceDelay)`
    - 客户端行为：在给定位置向玩家播放声音。不向服务端发送任何内容。如果 `distanceDelay` 为 `true`，会根据到玩家的距离延迟声音。
    - 服务端行为：不执行操作。
    - 用法：从服务端发送的自定义 Packet 中调用。原版将其用于雷声。
- `playPlayerSound(SoundEvent soundEvent, SoundSource soundSource, float volume, float pitch)`
    - 客户端行为：播放绑定到玩家位置的声音。不向服务端发送任何内容。
    - 服务端行为：不执行操作。
    - 用法：原版将其用于 Block 环境音。

### `ClientLevel`

- `playLocalSound(BlockPos pos, SoundEvent soundEvent, SoundSource soundSource, float volume, float pitch, boolean distanceDelay)`
    - 转发到 `Level#playLocalSound`，其中 `x`、`y`、`z` 分别取 `pos.getX() + 0.5`、`pos.getY() + 0.5`、`pos.getZ() + 0.5` 的值。

### `Entity`

- `playSound(SoundEvent soundEvent, float volume, float pitch)`
    - 转发到 `Level#playSound`：玩家参数为 `null`，Sound Source 为 `Entity#getSoundSource`，x/y/z 使用 Entity 位置，并传入其他参数。

### `Player`

- `playSound(SoundEvent soundEvent, float volume, float pitch)`（重写 `Entity` 中的方法）
    - 转发到 `Level#playSound`：玩家参数为 `this`，Sound Source 为 `SoundSource.PLAYER`，x/y/z 使用玩家位置，并传入其他参数。因此，客户端/服务端行为与 `Level#playSound` 相同：
        - 客户端行为：在给定位置向客户端玩家播放 Sound Event。
        - 服务端行为：向给定位置附近除调用该方法的玩家以外的所有人播放 Sound Event。

## Datagen

声音文件本身当然无法通过 [Datagen][datagen] 生成，但 `sounds.json` 文件可以。为此，请扩展 `SoundDefinitionsProvider` 并重写 `registerSounds()` 方法：

```java
public class MySoundDefinitionsProvider extends SoundDefinitionsProvider {
    // 参数可从`GatherDataEvent.Client` 获取。
    public MySoundDefinitionsProvider(PackOutput output) {
        // 使用你的实际模组 ID 而不是 "examplemod"。
        super(output, "examplemod");
    }

    @Override
    public void registerSounds() {
        // 第一个参数接受 Holder<SoundEvent>、SoundEvent 或 Identifier。
        add(MySoundsClass.MY_SOUND, SoundDefinition.definition()
            // 将声音对象添加到声音定义中。参数是一个可变参数。
            .with(
                // 接受字符串或 Identifier 作为第一个参数。
                // 第二个参数可以是 SOUND 或 EVENT；如果为前者，可以省略。
                sound("examplemod:sound_1", SoundDefinition.SoundType.SOUND)
                    // 设置音量。还有一个 double 对应项。
                    .volume(0.8f)
                    // 设置音高。还有一个 double 对应项。
                    .pitch(1.2f)
                    // 设置权重。
                    .weight(2)
                    // 设置衰减距离。
                    .attenuationDistance(8)
                    // 启用流式传输。
                    // 还具有遵循 stream(true) 的无参数重载。
                    .stream(true)
                    // 启用预加载。
                    // 还具有遵循 preload(true) 的无参数重载。
                    .preload(true),
                // 我们能得到的最短的。
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

与每个 Data Provider 一样，不要忘记把 Provider 注册到事件：

```java
@SubscribeEvent // 位于模组事件总线上
public static void gatherData(GatherDataEvent.Client event) {
    event.createProvider(MySoundDefinitionsProvider::new);
}
```

[bug]: https://bugs.mojang.com/browse/MC-146721
[datagen]: ../index.md#data-generation
[mcwiki]: https://minecraft.wiki
[mcwikisounds]: https://minecraft.wiki/w/Sounds.json
[modbus]: ../../concepts/events.md#事件总线
[modctor]: ../../gettingstarted/modfiles.md#javafml-and-mod
[registration]: ../../concepts/registries.md
[sides]: ../../concepts/sides.md#the-logical-side
[soundsjson]: #soundsjson

