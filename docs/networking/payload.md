# 注册Payload（Registering Payloads）

Payload 用于在客户端与服务器之间发送任意数据。它们通过 `RegisterPayloadHandlersEvent` 事件提供的 `PayloadRegistrar` 进行注册。

```java
@SubscribeEvent // 位于模组事件总线上
public static void register(RegisterPayloadHandlersEvent event) {
    // 设置当前网络版本
    final PayloadRegistrar registrar = event.registrar("1");
}
```

假设我们希望发送以下数据：

```java
public record MyData(String name, int age) {}
```

接下来可以实现 `CustomPacketPayload` 接口，创建一个能够收发这些数据的 payload。

```java
public record MyData(String name, int age) implements CustomPacketPayload {
    
    public static final CustomPacketPayload.Type<MyData> TYPE = new CustomPacketPayload.Type<>(Identifier.fromNamespaceAndPath("mymod", "my_data"));

    // 每对元素定义该元素的流编解码器为 encode/decode 以及该元素要编码的 getter
    // 'name' 将被编码和解码为字符串
    // 'age' 将被编码和解码为整数
    // 最后一个参数按提供顺序接收前述参数，用于构造 payload 对象
    public static final StreamCodec<ByteBuf, MyData> STREAM_CODEC = StreamCodec.composite(
        ByteBufCodecs.STRING_UTF8,
        MyData::name,
        ByteBufCodecs.VAR_INT,
        MyData::age,
        MyData::new
    );
    
    @Override
    public CustomPacketPayload.Type<? extends CustomPacketPayload> type() {
        return TYPE;
    }
}
```

从上面的示例可以看出，`CustomPacketPayload` 接口要求实现 `type` 方法。`type` 方法负责返回该 payload 的唯一标识符。除此之外，还需要一个稍后与 `StreamCodec` 一同注册的读写器，用来读取和写入 payload 数据。

最后，可以通过 registrar 注册该 payload：

```java
// 在一些常见的事件类中

@SubscribeEvent // 位于模组事件总线上
public static void register(RegisterPayloadHandlersEvent event) {
    final PayloadRegistrar registrar = event.registrar("1");
    registrar.playBidirectional(
        MyData.TYPE,
        MyData.STREAM_CODEC,
        ServerPayloadHandler::handleDataOnMain
    );
}

// 在某些仅限客户端的事件类中

@SubscribeEvent // 仅在物理客户端上的模组事件总线上
public static void register(RegisterClientPayloadHandlersEvent event) {
    event.register(
        MyData.TYPE,
        ClientPayloadHandler::handleDataOnMain
    );
}
```

分析上面的代码，可以看出以下几点：

- registrar 提供 `play*` 方法，用于注册在游戏 play 阶段发送的 payload。
    - 代码中没有展示 `configuration*` 和 `common*` 方法；前者同样可用于注册配置阶段的 payload，而 `common` 方法可以同时为配置阶段和 play 阶段注册 payload。
- registrar 使用 `*Bidirectional` 方法，注册会同时发送到逻辑服务器和逻辑客户端的 payload。
    - 代码中没有展示 `*ToClient` 和 `*ToServer` 方法；它们分别用于仅向逻辑客户端或仅向逻辑服务器注册 payload。
- payload 的类型用作该 payload 的唯一标识符。
- [StreamCodec][streamcodec] 用于从通过网络发送的缓冲区读取 payload，以及将 payload 写入该缓冲区。
- payload 处理器是 payload 到达某个逻辑端时调用的回调。
    - 如果使用 `*ToServer` 方法，payload 处理器是该方法的最后一个参数。
    - 如果使用 `*ToClient` 方法，则需要通过 `RegisterClientPayloadHandlersEvent` 注册 payload 处理器，并传入 payload 类型和处理器。
    - 如果使用 `*Bidirectional` 方法，则两种方式都需要提供 payload 处理器。

:::info
客户端 payload 处理器拥有自己的事件 `RegisterClientPayloadHandlersEvent`，目的是防止代码同时跨越逻辑[端和物理端][sides]。
:::

注册 payload 后，还需要实现处理器。本示例将重点介绍客户端处理器；服务器端处理器的实现方式非常相似。

```java
public class ClientPayloadHandler {
    
    public static void handleDataOnMain(final MyData data, final IPayloadContext context) {
        // 在主线程上对数据做一些事情
        blah(data.age());
    }
}
```

这里有几点需要注意：

- 处理方法会接收到 payload 和一个上下文对象。
- 默认情况下，payload 处理方法在主线程上调用。

如果需要执行资源开销很大的计算，应将这些工作放在网络线程中执行，避免阻塞主线程。对于发往服务器的连接，可以在注册 payload 之前调用 `PayloadRegistrar#executesOn`，把 `PayloadRegistrar` 的 `HandlerThread` 设置为 `HandlerThread#NETWORK`；对于发往客户端的连接，则需要把 `HandlerThread` 传给 `RegisterClientPayloadHandlersEvent#register`。

```java
// 在一些常见的事件类中

@SubscribeEvent // 位于模组事件总线上
public static void register(RegisterPayloadHandlersEvent event) {
    final PayloadRegistrar registrar = event.registrar("1")
        .executesOn(HandlerThread.NETWORK); // 所有后续有效负载将在网络线程上注册
    registrar.playBidirectional(
        MyData.TYPE,
        MyData.STREAM_CODEC,
        ServerPayloadHandler::handleDataOnNetwork
    );
}

// 在某些仅限客户端的事件类中

@SubscribeEvent // 仅在物理客户端上的模组事件总线上
public static void register(RegisterClientPayloadHandlersEvent event) {
    event.register(
        MyData.TYPE,
        HandlerThread.NETWORK // Payload 处理器将在网络线程上调用
        ClientPayloadHandler::handleDataOnNetwork
    );
}
```

:::info
一次 `executesOn` 调用之后注册的所有 payload，都会保持相同的线程执行位置，直到再次调用 `executesOn`。

```java
PayloadRegistrar registrar = event.registrar("1");

registrar.playBidirectional(...); // 在主线程上
registrar.playBidirectional(...); // 在主线程上

// 配置方法修改注册器的状态
// 通过创建新实例，因此需要进行更改
/// 通过存储结果进行更新
registrar = registrar.executesOn(HandlerThread.NETWORK);

registrar.playBidirectional(...); // 网络线程上
registrar.playBidirectional(...); // 网络线程上

registrar = registrar.executesOn(HandlerThread.MAIN);

registrar.playBidirectional(...); // 在主线程上
registrar.playBidirectional(...); // 在主线程上
```
:::

这里还有几点需要注意：

- 如果希望在游戏主线程中运行代码，可以使用 `enqueueWork` 向主线程提交任务。
    - 该方法返回一个将在主线程上完成的 `CompletableFuture`。
    - 注意：由于返回的是 `CompletableFuture`，你可以串联多个任务，并在同一处处理异常。
    - 如果不处理 `CompletableFuture` 中的异常，该异常将被静默吞掉，**你不会收到任何通知**。

```java
public class ClientPayloadHandler {
    
    public static void handleDataOnNetwork(final MyData data, final IPayloadContext context) {
        // 在网络线程上对数据执行某些操作
        blah(data.name());
        
        // 在主线程上对数据做一些事情
        context.enqueueWork(() -> {
            blah(data.age());
        })
        .exceptionally(e -> {
            // 处理异常
            context.disconnect(Component.translatable("my_mod.networking.failed", e.getMessage()));
            return null;
        });
    }
}
```

有了自己的 payload 后，便可以配合[配置任务][configuration]配置客户端和服务器。

## 发送 Payload

`CustomPacketPayload` 通过原版数据包系统在网络上传输：向服务器发送时，将 payload 包装到 `ServerboundCustomPayloadPacket` 中；向客户端发送时，则包装到 `ClientboundCustomPayloadPacket` 中。发往客户端的 payload 最多只能包含 1 MiB 数据；发往服务器的 payload 必须小于 32 KiB。

所有 payload 最终都通过 `Connection#send` 发送，只是其上存在不同层级的抽象。不过，如果需要按照某个条件向多个玩家发送数据包，直接调用这些方法通常并不方便。因此，`PacketDistributor` 提供了多种向客户端发送 payload 的便捷实现；`ClientPacketDistributor` 则提供了一个向服务器发送 payload 的方法 `sendToServer`。

```java
// ON THE CLIENT

// 发送负载到服务器
ClientPacketDistributor.sendToServer(new MyData(...));

// ON THE SERVER

// 发送至一位玩家 (ServerPlayer serverPlayer)
PacketDistributor.sendToPlayer(serverPlayer, new MyData(...));

/// 发送给所有追踪此 chunk 的玩家 (ServerLevel serverLevel, ChunkPos chunkPos)
PacketDistributor.sendToPlayersTrackingChunk(serverLevel, chunkPos, new MyData(...));

/// 发送给所有连接的玩家
PacketDistributor.sendToAllPlayers(new MyData(...));
```

更多实现请参阅 `PacketDistributor` 和 `ClientPacketDistributor` 类。

[configuration]: configuration-tasks.md
[sides]: ../concepts/sides.md
[streamcodec]: streamcodecs.md
