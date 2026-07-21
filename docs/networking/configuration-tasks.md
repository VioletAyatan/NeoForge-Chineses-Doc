# 使用配置任务（Configuration Tasks）

客户端与服务器的网络协议中包含一个特定阶段：在玩家真正加入游戏之前，服务器可以在这个阶段配置客户端。该阶段称为配置阶段（configuration phase）；例如，原版服务器会利用它向客户端发送资源包信息。

模组同样可以使用这个阶段，在玩家加入游戏之前配置客户端。

## 注册配置任务

使用配置阶段的第一步，是注册一个配置任务。为此，可以在 `RegisterConfigurationTasksEvent` 事件中注册新的配置任务。

```java
@SubscribeEvent // on the mod event bus
public static void register(final RegisterConfigurationTasksEvent event) {
    event.register(new MyConfigurationTask());
}
```

`RegisterConfigurationTasksEvent` 事件会在模组事件总线上触发，并公开服务器当前用于配置相应客户端的 listener。模组开发者可以通过这个 listener 判断客户端是否正在运行该模组；如果是，则注册配置任务。

## 实现配置任务

配置任务通过一个简单的接口 `ICustomConfigurationTask` 定义。该接口包含两个方法：`void run(Consumer<CustomPacketPayload> sender);`，以及返回配置任务类型的 `ConfigurationTask.Type type();`。该类型用于标识配置任务。下面给出了一个配置任务示例：

```java
public record MyConfigurationTask implements ICustomConfigurationTask {
    public static final ConfigurationTask.Type TYPE = new ConfigurationTask.Type(Identifier.fromNamespaceAndPath("mymod", "my_task"));
    
    @Override
    public void run(final Consumer<CustomPacketPayload> sender) {
        final MyData payload = new MyData();
        sender.accept(payload);
    }

    @Override
    public ConfigurationTask.Type type() {
        return TYPE;
    }
}
```

## 确认配置任务

配置会在服务器上执行，因此服务器需要知道何时可以执行下一个配置任务。为此，需要对当前配置任务的执行进行确认。

主要有两种实现方式：

### 捕获 listener

当客户端不需要确认配置任务时，可以捕获 listener，并直接在服务器端确认配置任务。

```java
public record MyConfigurationTask(ServerConfigurationPacketListener listener) implements ICustomConfigurationTask {
    public static final ConfigurationTask.Type TYPE = new ConfigurationTask.Type(Identifier.fromNamespaceAndPath("mymod", "my_task"));
    
    @Override
    public void run(final Consumer<CustomPacketPayload> sender) {
        final MyData payload = new MyData();
        sender.accept(payload);
        this.listener().finishCurrentTask(this.type());
    }

    @Override
    public ConfigurationTask.Type type() {
        return TYPE;
    }
}
```

若要使用这样的配置任务，需要在 `RegisterConfigurationTasksEvent` 事件中捕获 listener。

```java
@SubscribeEvent // on the mod event bus
public static void register(final RegisterConfigurationTasksEvent event) {
    event.register(new MyConfigurationTask(event.getListener()));
}
```

随后，当前配置任务完成后便会立即执行下一个配置任务，客户端无需对配置任务进行确认。此外，服务器也不会等待客户端正确处理已发送的 payload。

### 确认配置任务

当客户端需要确认配置任务时，需要将你自己的 payload 发送给客户端：

```java
public record AckPayload() implements CustomPacketPayload {
    public static final CustomPacketPayload.Type<AckPayload> TYPE = new CustomPacketPayload.Type<>(Identifier.fromNamespaceAndPath("mymod", "ack"));
    
    // Unit codec with no data to write
    public static final StreamCodec<ByteBuf, AckPayload> STREAM_CODEC = StreamCodec.unit(new AckPayload());

    @Override
    public CustomPacketPayload.Type<? extends CustomPacketPayload> type() {
        return TYPE;
    }
}
```

服务器端配置任务发来的 payload 被正确处理后，可以将这个 payload 发送回服务器，以确认该配置任务。

```java
public void onMyData(MyData data, IPayloadContext context) {
    context.enqueueWork(() -> {
        blah(data.name());
    })
    .exceptionally(e -> {
        // Handle exception
        context.disconnect(Component.translatable("my_mod.configuration.failed", e.getMessage()));
        return null;
    })
    .thenAccept(v -> {
        context.reply(new AckPayload());
    });     
}
```

其中，`onMyData` 是服务器端配置任务所发送 payload 的处理器。

服务器收到该 payload 后，会确认当前配置任务，并执行下一个配置任务：

```java
public void onAck(AckPayload payload, IPayloadContext context) {
    context.finishCurrentTask(MyConfigurationTask.TYPE);
}
```

其中，`onAck` 是客户端所发送 payload 的处理器。

## 阻塞登录流程

如果配置任务未得到确认，服务器将一直等待，客户端也永远无法加入游戏。因此，必须始终确认配置任务；如果配置任务执行失败，则应断开客户端连接。
