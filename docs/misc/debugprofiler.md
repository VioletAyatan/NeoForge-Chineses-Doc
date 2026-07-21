# 调试分析器（Debug Profiler）

Minecraft 提供了调试分析器（Debug Profiler），它会收集系统数据、当前游戏设置、JVM 数据、Level 数据以及各端的 tick 信息，用于定位耗时的代码。对于需要查找卡顿来源的模组开发者和服务器所有者而言，这在分析 `TickEvent`、持续 tick 的 `BlockEntity` 等内容时非常有用。

## 使用调试分析器

调试分析器的使用非常简单。按下调试快捷键 `F3 + L` 即可启动。它会在 10 秒后自动停止，也可以再次按下该快捷键提前停止。

:::info
显然，你只能分析实际执行到的代码路径。要让希望分析的 [`Entity`][entity] 和 [`BlockEntity`][blockentity] 出现在结果中，它们必须实际存在于 Level 中。
:::

停止分析器后，它会在运行目录的 `debug/profiling` 子目录中创建一个新的 zip 文件。
文件名采用日期和时间格式：`yyyy-mm-dd_hh_mi_ss-WorldName-VersionNumber.zip`。

## 阅读分析结果

在各端对应的文件夹（`client` 和 `server`）中，可以找到包含结果数据的 `profiling.txt` 文件。文件开头会先说明分析器运行了多少毫秒，以及在此期间执行了多少个 tick。

在其下方，可以看到与下面片段类似的信息：

```
[00] tick(201/1) - 41.46%/41.46%
[01] |   levels(201/1) - 96.62%/40.05%
[02] |   |   ServerLevel[New World] minecraft:overworld(201/1) - 98.80%/39.58%
[03] |   |   |   tick(201/1) - 99.98%/39.57%
[04] |   |   |   |   entities(201/1) - 56.83%/22.49%
[05] |   |   |   |   |   tick(44717/222) - 95.81%/21.54%
[06] |   |   |   |   |   |   minecraft:skeleton(4585/23) - 13.91%/3.00%
[07] |   |   |   |   |   |   |   #tickNonPassenger 4585/22
[07] |   |   |   |   |   |   |   travel(4573/23) - 33.12%/0.99%
[08] |   |   |   |   |   |   |   |   #getChunkCacheMiss 7/0
[08] |   |   |   |   |   |   |   |   #getChunk 47227/234
[08] |   |   |   |   |   |   |   |   move(4573/23) - 40.10%/0.40%
[09] |   |   |   |   |   |   |   |   |   #getEntities 4573/22
[09] |   |   |   |   |   |   |   |   |   #getChunkCacheMiss 1353/6
[09] |   |   |   |   |   |   |   |   |   #getChunk 28482/141
[08] |   |   |   |   |   |   |   |   unspecified(4573/23) - 36.24%/0.36%
[08] |   |   |   |   |   |   |   |   rest(4573/23) - 23.66%/0.23%
[09] |   |   |   |   |   |   |   |   |   #getChunkCacheMiss 59/0
[09] |   |   |   |   |   |   |   |   |   #getChunk 65867/327
[09] |   |   |   |   |   |   |   |   |   #getChunkNow 531/2
```

有些条目形如 `[03] tick(201/1) - 99.98%/39.57%`，它们由 `ProfilerFiller#push` 和 `pop` 产生，各部分含义如下：

- `[03]`：区段的深度。
- `tick`：区段名称。
    - 如果某段时间没有对应的子区段，则显示为 `unspecified`。
- `201`：分析器运行期间调用该区段的次数。
- `1`：单个 tick 内调用该区段的平均次数，向下取整。
- `99.98%`：相对于父区段所占用的时间百分比。
    - 对于第 0 层，它表示该部分占一个 tick 耗时的百分比。
    - 对于第 1 层，它表示该部分占父区段耗时的百分比。
- `39.57%`：相对于整个 tick 所占用的时间百分比。

还有一些条目形如 `[07] #tickNonPassenger 4585/22`，它们由 `ProfileFiller#incrementCounter` 产生，各部分含义如下：

- `[07]`：区段的深度。
- `#tickNonPassenger`：正在递增的计数器名称。
    - `#` 会自动添加到名称前面。
- `4585`：分析器运行期间该计数器递增的次数。
- `22`：单个 tick 内该计数器递增的平均次数，向下取整。

## 分析自己的代码

调试分析器为 `Entity` 和 `BlockEntity` 提供了基本支持。如果需要分析其他内容，可能需要像下面这样手动创建区段：

```java
Profiler.get().push("yourSectionName");
//The code you want to profile
Profiler.get().pop();
```

之后，只需在结果文件中搜索你的区段名称即可。

[blockentity]: ../blockentities/index.md
[entity]: ../entities/index.md
