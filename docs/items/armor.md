# 盔甲（Armor）

盔甲是主要通过各种抗性与效果保护 [`LivingEntity`][livingentity] 免受伤害的 [Item][item]。许多模组会添加新的盔甲套装（例如铜制盔甲）。

## 自定义盔甲套装

人形 Entity 的一套盔甲通常由四种 Item 组成：头部的头盔、胸部的胸甲、腿部的护腿与脚部的靴子。此外，狼、马和羊驼也有装备到专为动物设置的“身体”盔甲槽位的盔甲。所有这些 Item 通常通过七种 [数据组件][datacomponents] 实现：

- `DataComponents#MAX_DAMAGE` 与 `#DAMAGE`：耐久度
- `#MAX_STACK_SIZE`：将堆叠数量设置为 `1`
- `#REPAIRABLE`：在铁砧中修复盔甲部件
- `#ENCHANTABLE`：最大[附魔][enchantment]值
- `#ATTRIBUTE_MODIFIERS`：盔甲值、盔甲韧性与击退抗性
- `#EQUIPPABLE`：Entity 如何装备 Item

通常，人形 Entity 的每件盔甲使用 `Item.Properties#humanoidArmor` 设置，狼使用 `wolfArmor`，马使用 `horseArmor`，鹦鹉螺使用 `nautilusArmor`。它们都使用 `ArmorMaterial`，人形盔甲还会结合 `ArmorType` 来设置组件。参考值可在 `ArmorMaterials` 中找到。此示例使用铜制盔甲材料，你可以按需要调整其值。

```java
// 用于链接下文所述装备资源的 ResourceKey，
// 该资源由 `EquipmentClientInfo` JSON 定义。
// 指向 assets/examplemod/equipment/copper.json
public static final ResourceKey<EquipmentAsset> COPPER_ASSET = ResourceKey.create(EquipmentAssets.ROOT_ID, Identifier.fromNamespaceAndPath("examplemod", "copper"));

public static final ArmorMaterial COPPER_ARMOR_MATERIAL = new ArmorMaterial(
    // 盔甲材料的耐久倍数。
    // 不同 ArmorType 具有不同的单位耐久值，材料耐久倍数会应用于这些值：
    // - HELMET: 11
    // - CHESTPLATE: 16
    // - LEGGINGS: 15
    // - BOOTS: 13
    // - BODY: 16
    15,
    // 确定防御值（即盔甲条上显示的半格盔甲数）。
    // 基于 ArmorType。
    Util.make(new EnumMap<>(ArmorType.class), map -> {
        map.put(ArmorItem.Type.BOOTS, 2);
        map.put(ArmorItem.Type.LEGGINGS, 4);
        map.put(ArmorItem.Type.CHESTPLATE, 6);
        map.put(ArmorItem.Type.HELMET, 2);
        map.put(ArmorItem.Type.BODY, 4);
    }),
    // 决定盔甲的附魔能力。这代表了此盔甲上的附魔会有多好。
    // 黄金使用 25；这里将铜设为略低的值。
    20,
    // 决定装备此盔甲时播放的声音。
    // 这是用 Holder 包装的。
    SoundEvents.ARMOR_EQUIP_GENERIC,
     // 返回盔甲的韧性值。韧性是伤害计算中使用的附加值，
    // 更多信息请参阅 Minecraft Wiki 的盔甲机制文章：
    // https://minecraft.wiki/w/Armor#Armor_toughness
    // 这里只有钻石和下界合金的值大于 0，所以我们只是返回 0。
    0,
    // 返回盔甲的击退抗性值。当穿着此盔甲时，玩家
    // 在一定程度上免疫击退。如果玩家的总击退抗性值为 1 或更大
    // （由所有盔甲部件合计），就完全不会受到击退。
    // 这里只有下界合金的值大于 0，所以我们只是返回 0。
    0,
    // 确定哪些物品可以修复此盔甲的标签。
    Tags.Items.INGOTS_COPPER,
    // 下面讨论的 EquipmentClientInfo JSON 的资源键。
    COPPER_ASSET
);
```

有了 `ArmorMaterial` 后，可以用它[注册][registering]盔甲：

```java
// ITEMS 是 DeferredRegister.Items
public static final DeferredItem<Item> COPPER_HELMET = ITEMS.registerItem(
    "copper_helmet",
    props -> new Item(
        props.humanoidArmor(
            // 要使用的材料。
            COPPER_ARMOR_MATERIAL,
            // 要创建的盔甲类型。
            ArmorType.HELMET
        )
    )
);

public static final DeferredItem<Item> COPPER_CHESTPLATE =
    ITEMS.registerItem("copper_chestplate", props -> new Item(props.humanoidArmor(...)));
public static final DeferredItem<Item> COPPER_LEGGINGS =
    ITEMS.registerItem("copper_chestplate", props -> new Item(props.humanoidArmor(...)));
public static final DeferredItem<Item> COPPER_BOOTS =
    ITEMS.registerItem("copper_chestplate", props -> new Item(props.humanoidArmor(...)));

public static final DeferredItem<Item> COPPER_WOLF_ARMOR = ITEMS.registerItem(
    "copper_wolf_armor",
    props -> new Item(
        // 要使用的材料。
        props.wolfArmor(COPPER_ARMOR_MATERIAL)
    )
);

public static final DeferredItem<Item> COPPER_HORSE_ARMOR =
    ITEMS.registerItem("copper_horse_armor", props -> new Item(props.horseArmor(...)));

public static final DeferredItem<Item> COPPER_NAUTILUS_ARMOR =
    ITEMS.registerItem("copper_nautilus_armor", props -> new Item(props.nautilusArmor(...)));
```

如果想从头创建盔甲或类似盔甲的 Item，可以使用以下部分的组合实现：

- 通过 `Item.Properties#component` 设置 `DataComponents#EQUIPPABLE`，添加带有自定义要求的 `Equippable`。
- 通过 `Item.Properties#attributes` 向 Item 添加 attribute（例如盔甲值、韧性、击退抗性）。
- 通过 `Item.Properties#durability` 添加 Item 耐久度。
- 通过 `Item.Properties#repariable` 允许修复 Item。
- 通过 `Item.Properties#enchantable` 允许为 Item 附魔。
- 将盔甲添加到某些 `minecraft:enchantable/*` `ItemTags`，使其可应用特定附魔。

### `Equippable`

`Equippable` 是一种数据组件，包含 Entity 如何装备该 Item，以及游戏中由什么来处理其渲染。只要有此组件，任何 Item 都可以装备，而不论它是否被视为“盔甲”（例如鞍、羊驼身上的地毯）。每个带有此组件的 Item 只能装备到单个 `EquipmentSlot`。

可以直接调用 record 构造器创建 `Equippable`，也可以通过 `Equippable#builder` 创建；后者会为每个字段设置默认值，完成后再调用 `build`：

```java
// 用于链接下文所述装备资源的 ResourceKey，
// 该资源由 `EquipmentClientInfo` JSON 定义。
// 指向 assets/examplemod/equipment/equippable.json
public static final ResourceKey<EquipmentAsset> EXAMPLE_EQUIPABBLE = ResourceKey.create(EquipmentAssets.ROOT_ID, Identifier.fromNamespaceAndPath("examplemod", "equippable"));

// 假设有一些 DeferredRegister.Items ITEMS
public static final DeferredItem<Item> EQUIPPABLE = ITEMS.registerSimpleItem(
    "equippable",
    props -> props.component(
        DataComponents.EQUIPPABLE,
        // 设置此物品可以装备的槽位。
        Equippable.builder(EquipmentSlot.HELMET)
            // 确定装备此物品时播放的声音。
            // 这是用 Holder 包装的。
            // 默认为 SoundEvents#ARMOR_EQUIP_GENERIC。
            .setEquipSound(SoundEvents.ARMOR_EQUIP_GENERIC)
            // 下面讨论的 EquipmentClientInfo JSON 的资源键。
            // 未设置时，不渲染装备。
            .setAsset(ResourceKey.create(EXAMPLE_EQUIPABBLE))
            // 穿戴时叠加到玩家屏幕上的纹理相对位置（例如南瓜视野遮罩）。
            // 指向 assets/examplemod/textures/equippable.png
            // 未设置时，不渲染叠加层。
            .setCameraOverlay(Identifier.withDefaultNamespace("examplemod", "equippable"))
            // 可装备此物品的 Entity type HolderSet（直接值或标签）。
            // 未设置时，任何实体都可以装备此物品。
            .setAllowedEntities(EntityType.ZOMBIE)
            // 从分配器分配该物品时是否可以装备。
            // 默认为 true。
            .setDispensable(true),
            // 是否可以在快速装备期间从玩家身上交换该物品。
            // 默认为 true。
            .setSwappable(false),
            // 物品受到攻击时是否应损失耐久（通常用于装备）。
            // 也必须是易损物品。
            // 默认为 true。
            .setDamageOnHurt(false)
            // 该物品是否可以通过交互装备到另一个 Entity 上（例如右键单击）。
            // 默认为 false。
            .setEquipOnInteract(true)
            // 为 true 时，具有 SHEAR_REMOVE_ARMOR 物品能力的物品可以移除已装备的物品。
            // 默认为 false。
            .setCanBeSheared(true)
            // 剪切此装备物品时播放的声音。
            // 该值包装在 Holder 中。
            // 默认为 SoundEvents#SHEARS_SNIP。
            .setShearingSound(SoundEvents.SADDLE_UNEQUIP)
            .build()
    )
);
```

## Equipment Assets {#equipment-assets}

现在游戏中已经有了盔甲，但如果尝试穿戴，什么都不会渲染，因为我们从未指定如何渲染装备。为此，需要在 `Equippable#assetId` 指定的位置创建 `EquipmentClientInfo` JSON；该位置相对于[资源包][respack]（`assets` 文件夹）的 `equipment` 文件夹。`EquipmentClientInfo` 指定每个待渲染层使用的关联纹理。

`EquipmentClientInfo` 在功能上是从 `EquipmentClientInfo.LayerType` 到待应用 `EquipmentClientInfo.Layer` 列表的映射。

可以将 `LayerType` 理解为针对某个实例渲染的一组纹理。例如，`LayerType#HUMANOID` 由 `HumanoidArmorLayer` 用于渲染人形 Entity 的头部、胸部与脚部；`LayerType#WOLF_BODY` 由 `WolfArmorLayer` 用于渲染身体盔甲。如果属于同一类可装备物（例如铜制盔甲），这些内容可以合并到同一个装备信息 JSON 中。

`LayerType` 映射到某个待应用的 `Layer` 列表，并按给定顺序渲染纹理。一个 `Layer` 实际上表示单个待渲染纹理。第一个参数表示纹理相对于 `textures/entity/equipment` 的位置。

第二个参数是 `Optional`，表示是否可以使用 `EquipmentClientInfo.Dyeable` [为纹理着色][tinting]。`Dyeable` 对象持有一个整数；如果该整数存在，就表示纹理默认着色所用的 RGB 颜色。如果此 `Optional` 为空，则使用纯白色。

:::warning
要向 Item 应用未染色颜色以外的着色值，该 Item 必须位于 [`ItemTags#DYEABLE`][tag] 中，并将 `DataComponents#DYED_COLOR` 组件设置为某个 RGB 值。
:::

第三个参数是布尔值，表示是否应使用渲染期间提供的纹理来替代 `Layer` 中定义的纹理。玩家的自定义披风或鞘翅纹理就是一个示例。

下面为铜制盔甲材料创建装备信息。还假设每个层有两张纹理：一张是实际盔甲，另一张叠加在其上并进行着色。对于动物盔甲，假设存在某个可传入的动态纹理。

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
// 在 assets/examplemod/equipment/copper.json 中
{
    // 图层图
    "layers": {
        // 要应用的 EquipmentClientInfo.LayerType 的序列化名称。
        // 用于人形头部、胸部和脚部
        "humanoid": [
            // 按提供的顺序渲染的图层列表
            {
                // 盔甲的相对纹理
                // 指向 assets/examplemod/textures/entity/equipment/humanoid/copper/outer.png
                "texture": "examplemod:copper/outer"
            },
            {
                // 叠加纹理
                // 指向 assets/examplemod/textures/entity/equipment/humanoid/copper/outer_overlay.png
                "texture": "examplemod:copper/outer_overlay",
                // 指定时，允许纹理着色为 DataComponents#DYED_COLOR 中的颜色
                // 否则无法着色
                "dyeable": {
                    // 一个 RGB 值（始终为不透明颜色）
                    // 0x7683DE 十进制
                    // 不指定时设置为0（表示透明或不可见）
                    "color_when_undyed": 7767006
                }
            }
        ],
        // 人形腿
        "humanoid_leggings": [
            {
                // 指向 assets/examplemod/textures/entity/equipment/humanoid_leggings/copper/inner.png
                "texture": "examplemod:copper/inner"
            },
            {
                // 指向 assets/examplemod/textures/entity/equipment/humanoid_leggings/copper/inner_overlay.png
                "texture": "examplemod:copper/inner_overlay",
                "dyeable": {
                    "color_when_undyed": 7767006
                }
            }
        ],
        // 用于狼甲
        "wolf_body": [
            {
                // 指向 assets/examplemod/textures/entity/equipment/wolf_body/copper/wolf.png
                "texture": "examplemod:copper/wolf",
                // 当 true 时，使用传递到图层渲染器的纹理
                "use_player_texture": true
            }
        ],
        // 用于马甲
        "horse_body": [
            {
                // 指向 assets/examplemod/textures/entity/equipment/horse_body/copper/horse.png
                "texture": "examplemod:copper/horse",
                "use_player_texture": true
            }
        ],
        // 用于鹦鹉螺盔甲
        "nautilus_body": [
            {
                // 指向 assets/examplemod/textures/entity/equipment/nautilus_body/copper/nautilus.png
                "texture": "examplemod:copper/nautilus",
                "use_player_texture": true
            }
        ]
    }
}
```

</TabItem>

<TabItem value="datagen" label="数据生成">

```java
public class MyEquipmentInfoProvider extends EquipmentAssetProvider {

    public MyEquipmentInfoProvider(PackOutput output) {
        super(output);
    }

    @Override
    protected void registerModels(BiConsumer<ResourceKey<EquipmentAsset>, EquipmentClientInfo> output) {
        output.accept(
            // 必须匹配 Equippable#assetId
            COPPER_ASSET,
            EquipmentClientInfo.builder()
                // 用于人形头部、胸部和脚部
                .addLayers(
                    EquipmentClientInfo.LayerType.HUMANOID,
                    // 基础纹理
                    new EquipmentClientInfo.Layer(
                        // 盔甲的相对纹理
                        // 指向 assets/examplemod/textures/entity/equipment/humanoid/copper/outer.png
                        Identifier.fromNamespaceAndPath("examplemod", "copper/outer"),
                        Optional.empty(),
                        false
                    ),
                    // 叠加纹理
                    new EquipmentClientInfo.Layer(
                        // 叠加纹理
                        // 指向 assets/examplemod/textures/entity/equipment/humanoid/copper/outer_overlay.png
                        Identifier.fromNamespaceAndPath("examplemod", "copper/outer_overlay"),
                        // 一个 RGB 值（始终为不透明颜色）
                        // 不指定时设置为0（表示透明或不可见）
                        Optional.of(new EquipmentClientInfo.Dyeable(Optional.of(0x7683DE))),
                        false
                    )
                )
                // 人形腿
                .addLayers(
                    EquipmentClientInfo.LayerType.HUMANOID_LEGGINGS,
                    new EquipmentClientInfo.Layer(
                        // 指向 assets/examplemod/textures/entity/equipment/humanoid_leggings/copper/inner.png
                        Identifier.fromNamespaceAndPath("examplemod", "copper/inner"),
                        Optional.empty(),
                        false
                    ),
                    new EquipmentClientInfo.Layer(
                        // 指向 assets/examplemod/textures/entity/equipment/humanoid_leggings/copper/inner_overlay.png
                        Identifier.fromNamespaceAndPath("examplemod", "copper/inner_overlay"),
                        Optional.of(new EquipmentClientInfo.Dyeable(Optional.of(0x7683DE))),
                        false
                    )
                )
                // 用于狼甲
                .addLayers(
                    EquipmentClientInfo.LayerType.WOLF_BODY,
                    // 基础纹理
                    new EquipmentClientInfo.Layer(
                        // 指向 assets/examplemod/textures/entity/equipment/wolf_body/copper/wolf.png
                        Identifier.fromNamespaceAndPath("examplemod", "copper/wolf"),
                        Optional.empty(),
                        // 当 true 时，使用传递到图层渲染器的纹理
                        true
                    )
                )
                // 用于马甲
                .addLayers(
                    EquipmentClientInfo.LayerType.HORSE_BODY,
                    // 基础纹理
                    new EquipmentClientInfo.Layer(
                        // 指向 assets/examplemod/textures/entity/equipment/horse_body/copper/horse.png
                        Identifier.fromNamespaceAndPath("examplemod", "copper/horse"),
                        Optional.empty(),
                        true
                    )
                )
                // 用于鹦鹉螺盔甲
                .addLayers(
                    EquipmentClientInfo.LayerType.NAUTILUS_BODY,
                    // 基础纹理
                    new EquipmentClientInfo.Layer(
                        // 指向 assets/examplemod/textures/entity/equipment/nautilus_body/copper/nautilus.png
                        Identifier.fromNamespaceAndPath("examplemod", "copper/nautilus"),
                        Optional.empty(),
                        true
                    )
                )
                .build()
        );
    }
}

@SubscribeEvent // 位于模组事件总线上
public static void gatherData(GatherDataEvent.Client event) {
    event.createProvider(MyEquipmentInfoProvider::new);
}
```

</TabItem>
</Tabs>

## 装备渲染

装备信息通过 `EntityRenderer` 或其某个 `RenderLayer` 的渲染函数中的 `EquipmentLayerRenderer` 渲染。`EquipmentLayerRenderer` 作为渲染上下文的一部分，通过 `EntityRendererProvider.Context#getEquipmentRenderer` 获取。如果需要 `EquipmentClientInfo`，也可以通过 `EntityRendererProvider.Context#getEquipmentAssets` 获取。

默认情况下，以下层会渲染关联的 `EquipmentClientInfo.LayerType`：

| `LayerType`             | `RenderLayer`          | 使用者                                                         |
|:-----------------------:|:----------------------:|:---------------------------------------------------------------|
| `HUMANOID`              | `HumanoidArmorLayer`   | 玩家、人形 Mob（如僵尸、骷髅）、盔甲架                          |
| `HUMANOID_LEGGINGS`     | `HumanoidArmorLayer`   | 玩家、人形 Mob（如僵尸、骷髅）、盔甲架                          |
| `HUMANOID_BABY`         | `HumanoidArmorLayer`   | 玩家、幼年人形 Mob（如幼年僵尸）                                |
| `WINGS`                 | `WingsLayer`           | 玩家、人形 Mob（如僵尸、骷髅）、盔甲架                          |
| `WOLF_BODY`             | `WolfArmorLayer`       | 狼                                                             |
| `HORSE_BODY`            | `HorseArmorLayer`      | 马                                                             |
| `LLAMA_BODY`            | `LlamaDecorLayer`      | 羊驼、行商羊驼                                                 |
| `PIG_SADDLE`            | `SimpleEquipmentLayer` | 猪                                                             |
| `STRIDER_SADDLE`        | `SimpleEquipmentLayer` | 炽足兽                                                         |
| `CAMEL_SADDLE`          | `SimpleEquipmentLayer` | 骆驼                                                           |
| `CAMEL_HUSK_SADDLE`     | `SimpleEquipmentLayer` | 骆驼尸壳                                                       |
| `HORSE_SADDLE`          | `SimpleEquipmentLayer` | 马                                                             |
| `DONKEY_SADDLE`         | `SimpleEquipmentLayer` | 驴                                                             |
| `MULE_SADDLE`           | `SimpleEquipmentLayer` | 骡                                                             |
| `ZOMBIE_HORSE_SADDLE`   | `SimpleEquipmentLayer` | 僵尸马                                                         |
| `SKELETON_HORSE_SADDLE` | `SimpleEquipmentLayer` | 骷髅马                                                         |
| `HAPPY_GHAST_BODY`      | `SimpleEquipmentLayer` | 快乐恶魂                                                       |
| `NAUTILUS_SADDLE`       | `SimpleEquipmentLayer` | 鹦鹉螺                                                         |
| `NAUTILUS_BODY`         | `SimpleEquipmentLayer` | 鹦鹉螺                                                         |

`EquipmentLayerRenderer` 只有一个提交装备层进行渲染的方法：`renderLayers`。

```java
// 在 EquipmentLayerRenderer equipmentLayerRenderer 可用的某些渲染方法中
this.equipmentLayerRenderer.renderLayers(
    // 要渲染的图层类型
    EquipmentClientInfo.LayerType.HUMANOID,
    // 表示 EquipmentClientInfo JSON 的资源键
    // 这将通过 `assetId` 在 `EQUIPPABLE` 数据组件中设置
    stack.get(DataComponents.EQUIPPABLE).assetId().orElseThrow(),
    // 应用设备信息的模型
    // 这些通常是与实体模型分开的模型
    // 和 ModelLayers 是单独链接到 LayerDefinition
    model,
    // 表示正在渲染为模型的物品的ItemStack
    // 这仅用于获取可染色、箔和盔甲装饰信息
    stack,
    // 用于在正确位置渲染模型的姿势堆栈
    poseStack,
    // 模型数据提交到的收集器
    collector,
    // 打包的灯光坐标
    lightCoords,
    // 当 use_player_texture 为其中一层的 true（如果不是 null）时要渲染的纹理的绝对路径
    // 表示资产文件夹内的绝对位置
    Identifier.fromNamespaceAndPath("examplemod", "textures/other_texture.png"),
    // 模型轮廓的颜色
    // 仅当轮廓颜色不为 0 并且 `RenderType` 具有或是轮廓类型时使用
    outlineColor,
    // 提交 layer 与纹饰时的起始顺序优先级；每提交一个模型就递增一次
    // 默认情况下，此为 1
    order
);
```

[item]: index.md
[datacomponents]: datacomponents.md
[enchantment]: ../resources/server/enchantments/index.md#enchantment-costs-and-levels
[livingentity]: ../entities/livingentity.md
[registering]: ../concepts/registries.md#methods-for-registering
[rendering]: #equipment-rendering
[respack]: ../resources/index.md#assets
[tag]: ../resources/server/tags.md
[tinting]: ../resources/client/models/index.md#tinting
