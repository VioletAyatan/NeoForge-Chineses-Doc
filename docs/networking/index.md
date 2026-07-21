# 网络通讯（Networking）

服务器与客户端之间的通信，是成功实现一个模组的基础。

网络通信主要有两个目标：

1. 确保客户端所看到的状态与服务器端状态“同步”
    - 坐标 (X, Y, Z) 处的花刚刚生长了
1. 为客户端提供一种方式，用来通知服务器玩家发生了某些变化
    - 玩家按下了某个按键

实现这些目标最常见的方式，是在客户端与服务器之间传递消息。这些消息通常采用结构化形式，以特定方式组织其中的数据，从而便于发送和接收。

NeoForge 提供了一套主要构建于 [netty] 之上的通信机制。使用该机制时，可以监听 `RegisterPayloadHandlersEvent` 事件，然后向 registrar 注册特定类型的 [payload][payloads]、对应的读取器以及处理函数。

[netty]: https://netty.io "Netty 网站"
[payloads]: payload.md "注册自定义 Payload"
