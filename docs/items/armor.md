# 盔甲

盔甲是主要通过各种抗性与效果保护 [`LivingEntity`][livingentity] 免受伤害的 [Item][item]。许多模组会添加新的盔甲套装（例如铜制盔甲）。

## 自定义盔甲套装

人形 Entity 的一套盔甲通常由四种 Item 组成：头部的头盔、胸部的胸甲、腿部的护腿与脚部的靴子。此外，狼、马和羊驼也有装备到专为动物设置的“身体”盔甲槽位的盔甲。所有这些 Item 通常通过七种 [data component][datacomponents] 实现：

- `DataComponents#MAX_DAMAGE` 与 `#DAMAGE`：耐久度
- `#MAX_STACK_SIZE`：将堆叠数量设置为 `1`
- `#REPAIRABLE`：在铁砧中修复盔甲部件
- `#ENCHANTABLE`：最大[附魔][enchantment]值
- `#ATTRIBUTE_MODIFIERS`：盔甲值、盔甲韧性与击退抗性
- `#EQUIPPABLE`：Entity 如何装备 Item

通常，人形 Entity 的每件盔甲使用 `Item.Properties#humanoidArmor` 设置，狼使用 `wolfArmor`，马使用 `horseArmor`，鹦鹉螺使用 `nautilusArmor`。它们都使用 `ArmorMaterial`，人形盔甲还会结合 `ArmorType` 来设置 component。参考值可在 `ArmorMaterials` 中找到。此示例使用铜制盔甲材料，你可以按需要调整其值。

```java
// The resource key of the equipment asset used to link
// the `EquipmentClientInfo` JSON discussed below.
// Points to assets/examplemod/equipment/copper.json
public static final ResourceKey<EquipmentAsset> COPPER_ASSET = ResourceKey.create(EquipmentAssets.ROOT_ID, Identifier.fromNamespaceAndPath("examplemod", "copper"));

public static final ArmorMaterial COPPER_ARMOR_MATERIAL = new ArmorMaterial(
    // The durability multiplier of the armor material.
    // ArmorType have different unit durabilities that the multiplier is applied to:
    // - HELMET: 11
    // - CHESTPLATE: 16
    // - LEGGINGS: 15
    // - BOOTS: 13
    // - BODY: 16
    15,
    // Determines the defense value (or the number of half-armors on the bar).
    // Based on ArmorType.
    Util.make(new EnumMap<>(ArmorType.class), map -> {
        map.put(ArmorItem.Type.BOOTS, 2);
        map.put(ArmorItem.Type.LEGGINGS, 4);
        map.put(ArmorItem.Type.CHESTPLATE, 6);
        map.put(ArmorItem.Type.HELMET, 2);
        map.put(ArmorItem.Type.BODY, 4);
    }),
    // Determines the enchantability of the armor. This represents how good the enchantments on this armor will be.
    // Gold uses 25; we put copper slightly below that.
    20,
    // Determines the sound played when equipping this armor.
    // This is wrapped with a Holder.
    SoundEvents.ARMOR_EQUIP_GENERIC,
     // Returns the toughness value of the armor. The toughness value is an additional value included in
    // damage calculation, for more information, refer to the Minecraft Wiki's article on armor mechanics:
    // https://minecraft.wiki/w/Armor#Armor_toughness
    // Only diamond and netherite have values greater than 0 here, so we just return 0.
    0,
    // Returns the knockback resistance value of the armor. While wearing this armor, the player is
    // immune to knockback to some degree. If the player has a total knockback resistance value of 1 or greater
    // from all armor pieces combined, they will not take any knockback at all.
    // Only netherite has values greater than 0 here, so we just return 0.
    0,
    // The tag that determines what items can repair this armor.
    Tags.Items.INGOTS_COPPER,
    // The resource key of the EquipmentClientInfo JSON discussed below.
    COPPER_ASSET
);
```

有了 `ArmorMaterial` 后，可以用它[注册][registering]盔甲：

```java
// ITEMS is a DeferredRegister.Items
public static final DeferredItem<Item> COPPER_HELMET = ITEMS.registerItem(
    "copper_helmet",
    props -> new Item(
        props.humanoidArmor(
            // The material to use.
            COPPER_ARMOR_MATERIAL,
            // The type of armor to create.
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
        // The material to use.
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

`Equippable` 是一种 data component，包含 Entity 如何装备该 Item，以及游戏中由什么来处理其渲染。只要有此 component，任何 Item 都可以装备，而不论它是否被视为“盔甲”（例如鞍、羊驼身上的地毯）。每个带有此 component 的 Item 只能装备到单个 `EquipmentSlot`。

可以直接调用 record constructor 创建 `Equippable`，也可以通过 `Equippable#builder` 创建；后者会为每个 field 设置默认值，完成后再调用 `build`：

```java
// The resource key of the equipment asset used to link
// the `EquipmentClientInfo` JSON discussed below.
// Points to assets/examplemod/equipment/equippable.json
public static final ResourceKey<EquipmentAsset> EXAMPLE_EQUIPABBLE = ResourceKey.create(EquipmentAssets.ROOT_ID, Identifier.fromNamespaceAndPath("examplemod", "equippable"));

// Assume there is some DeferredRegister.Items ITEMS
public static final DeferredItem<Item> EQUIPPABLE = ITEMS.registerSimpleItem(
    "equippable",
    props -> props.component(
        DataComponents.EQUIPPABLE,
        // Sets the slot that this item can be equipped to.
        Equippable.builder(EquipmentSlot.HELMET)
            // Determines the sound played when equipping this item.
            // This is wrapped with a Holder.
            // Defaults to SoundEvents#ARMOR_EQUIP_GENERIC.
            .setEquipSound(SoundEvents.ARMOR_EQUIP_GENERIC)
            // The resource key of the EquipmentClientInfo JSON discussed below.
            // When not set, does not render the equipment.
            .setAsset(ResourceKey.create(EXAMPLE_EQUIPABBLE))
            // The relative location of the texture to overlay on the player screen when wearing (e.g., pumpkin blur).
            // Points to assets/examplemod/textures/equippable.png
            // When not set, does not render an overlay.
            .setCameraOverlay(Identifier.withDefaultNamespace("examplemod", "equippable"))
            // A HolderSet of entity types (direct or tag) that can equip this item.
            // When not set, any entity can equip this item.
            .setAllowedEntities(EntityType.ZOMBIE)
            // Whether the item can be equipped when dispensed from a dispenser.
            // Defaults to true.
            .setDispensable(true),
            // Whether the item can be swapped off the player during a quick equip.
            // Defaults to true.
            .setSwappable(false),
            // Whether the item should be damaged when attacked (for equipment typically).
            // Must also be a damageable item.
            // Defaults to true.
            .setDamageOnHurt(false)
            // Whether the item can be equipped onto another entity on interaction (e.g., right click).
            // Defaults to false.
            .setEquipOnInteract(true)
            // When true, an item with the SHEAR_REMOVE_ARMOR item ability can remove the equipped item.
            // Defaults to false.
            .setCanBeSheared(true)
            // The sound to play when shearing this equipped item.
            // This is wrapped with a holder.
            // Defaults to SoundEvents#SHEARS_SNIP.
            .setShearingSound(SoundEvents.SADDLE_UNEQUIP)
            .build()
    )
);
```

## Equipment Asset

现在游戏中已经有了盔甲，但如果尝试穿戴，什么都不会渲染，因为我们从未指定如何渲染装备。为此，需要在 `Equippable#assetId` 指定的位置创建 `EquipmentClientInfo` JSON；该位置相对于 [resource pack][respack]（`assets` 文件夹）的 `equipment` 文件夹。`EquipmentClientInfo` 指定每个待渲染 layer 使用的关联纹理。

`EquipmentClientInfo` 在功能上是从 `EquipmentClientInfo.LayerType` 到待应用 `EquipmentClientInfo.Layer` 列表的 map。

可以将 `LayerType` 理解为针对某个实例渲染的一组纹理。例如，`LayerType#HUMANOID` 由 `HumanoidArmorLayer` 用于渲染人形 Entity 的头部、胸部与脚部；`LayerType#WOLF_BODY` 由 `WolfArmorLayer` 用于渲染身体盔甲。如果属于同一类可装备物（例如铜制盔甲），这些内容可以合并到同一个装备信息 JSON 中。

`LayerType` 映射到某个待应用的 `Layer` 列表，并按给定顺序渲染纹理。一个 `Layer` 实际上表示单个待渲染纹理。第一个参数表示纹理相对于 `textures/entity/equipment` 的位置。

第二个参数是 optional，表示是否可以将[纹理着色][tinting]为 `EquipmentClientInfo.Dyeable`。`Dyeable` 对象持有一个整数；如果该整数存在，就表示纹理默认着色所用的 RGB 颜色。如果此 optional 不存在，则使用纯白色。

:::warning
要向 Item 应用未染色颜色以外的 tint，该 Item 必须位于 [`ItemTags#DYEABLE`][tag] 中，并将 `DataComponents#DYED_COLOR` component 设置为某个 RGB 值。
:::

第三个参数是 boolean，表示是否应使用渲染期间提供的纹理来替代 `Layer` 中定义的纹理。玩家的自定义披风或鞘翅纹理就是一个示例。

下面为铜制盔甲材料创建装备信息。还假设每个 layer 有两张纹理：一张是实际盔甲，另一张叠加在其上并进行着色。对于动物盔甲，假设存在某个可传入的动态纹理。

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
// In assets/examplemod/equipment/copper.json
{
    // The layer map
    "layers": {
        // The serialized name of the EquipmentClientInfo.LayerType to apply.
        // For humanoid head, chest, and feet
        "humanoid": [
            // A list of layers to render in the order provided
            {
                // The relative texture of the armor
                // Points to assets/examplemod/textures/entity/equipment/humanoid/copper/outer.png
                "texture": "examplemod:copper/outer"
            },
            {
                // The overlay texture
                // Points to assets/examplemod/textures/entity/equipment/humanoid/copper/outer_overlay.png
                "texture": "examplemod:copper/outer_overlay",
                // When specified, allows the texture to be tinted the color in DataComponents#DYED_COLOR
                // Otherwise, cannot be tinted
                "dyeable": {
                    // An RGB value (always opaque color)
                    // 0x7683DE as decimal
                    // When not specified, set to 0 (meaning transparent or invisible)
                    "color_when_undyed": 7767006
                }
            }
        ],
        // For humanoid legs
        "humanoid_leggings": [
            {
                // Points to assets/examplemod/textures/entity/equipment/humanoid_leggings/copper/inner.png
                "texture": "examplemod:copper/inner"
            },
            {
                // Points to assets/examplemod/textures/entity/equipment/humanoid_leggings/copper/inner_overlay.png
                "texture": "examplemod:copper/inner_overlay",
                "dyeable": {
                    "color_when_undyed": 7767006
                }
            }
        ],
        // For wolf armor
        "wolf_body": [
            {
                // Points to assets/examplemod/textures/entity/equipment/wolf_body/copper/wolf.png
                "texture": "examplemod:copper/wolf",
                // When true, uses the texture passed into the layer renderer instead
                "use_player_texture": true
            }
        ],
        // For horse armor
        "horse_body": [
            {
                // Points to assets/examplemod/textures/entity/equipment/horse_body/copper/horse.png
                "texture": "examplemod:copper/horse",
                "use_player_texture": true
            }
        ],
        // For nautilus armor
        "nautilus_body": [
            {
                // Points to assets/examplemod/textures/entity/equipment/nautilus_body/copper/nautilus.png
                "texture": "examplemod:copper/nautilus",
                "use_player_texture": true
            }
        ]
    }
}
```

</TabItem>

<TabItem value="datagen" label="Datagen">

```java
public class MyEquipmentInfoProvider extends EquipmentAssetProvider {

    public MyEquipmentInfoProvider(PackOutput output) {
        super(output);
    }

    @Override
    protected void registerModels(BiConsumer<ResourceKey<EquipmentAsset>, EquipmentClientInfo> output) {
        output.accept(
            // Must match Equippable#assetId
            COPPER_ASSET,
            EquipmentClientInfo.builder()
                // For humanoid head, chest, and feet
                .addLayers(
                    EquipmentClientInfo.LayerType.HUMANOID,
                    // Base texture
                    new EquipmentClientInfo.Layer(
                        // The relative texture of the armor
                        // Points to assets/examplemod/textures/entity/equipment/humanoid/copper/outer.png
                        Identifier.fromNamespaceAndPath("examplemod", "copper/outer"),
                        Optional.empty(),
                        false
                    ),
                    // Overlay texture
                    new EquipmentClientInfo.Layer(
                        // The overlay texture
                        // Points to assets/examplemod/textures/entity/equipment/humanoid/copper/outer_overlay.png
                        Identifier.fromNamespaceAndPath("examplemod", "copper/outer_overlay"),
                        // An RGB value (always opaque color)
                        // When not specified, set to 0 (meaning transparent or invisible)
                        Optional.of(new EquipmentClientInfo.Dyeable(Optional.of(0x7683DE))),
                        false
                    )
                )
                // For humanoid legs
                .addLayers(
                    EquipmentClientInfo.LayerType.HUMANOID_LEGGINGS,
                    new EquipmentClientInfo.Layer(
                        // Points to assets/examplemod/textures/entity/equipment/humanoid_leggings/copper/inner.png
                        Identifier.fromNamespaceAndPath("examplemod", "copper/inner"),
                        Optional.empty(),
                        false
                    ),
                    new EquipmentClientInfo.Layer(
                        // Points to assets/examplemod/textures/entity/equipment/humanoid_leggings/copper/inner_overlay.png
                        Identifier.fromNamespaceAndPath("examplemod", "copper/inner_overlay"),
                        Optional.of(new EquipmentClientInfo.Dyeable(Optional.of(0x7683DE))),
                        false
                    )
                )
                // For wolf armor
                .addLayers(
                    EquipmentClientInfo.LayerType.WOLF_BODY,
                    // Base texture
                    new EquipmentClientInfo.Layer(
                        // Points to assets/examplemod/textures/entity/equipment/wolf_body/copper/wolf.png
                        Identifier.fromNamespaceAndPath("examplemod", "copper/wolf"),
                        Optional.empty(),
                        // When true, uses the texture passed into the layer renderer instead
                        true
                    )
                )
                // For horse armor
                .addLayers(
                    EquipmentClientInfo.LayerType.HORSE_BODY,
                    // Base texture
                    new EquipmentClientInfo.Layer(
                        // Points to assets/examplemod/textures/entity/equipment/horse_body/copper/horse.png
                        Identifier.fromNamespaceAndPath("examplemod", "copper/horse"),
                        Optional.empty(),
                        true
                    )
                )
                // For nautilus armor
                .addLayers(
                    EquipmentClientInfo.LayerType.NAUTILUS_BODY,
                    // Base texture
                    new EquipmentClientInfo.Layer(
                        // Points to assets/examplemod/textures/entity/equipment/nautilus_body/copper/nautilus.png
                        Identifier.fromNamespaceAndPath("examplemod", "copper/nautilus"),
                        Optional.empty(),
                        true
                    )
                )
                .build()
        );
    }
}

@SubscribeEvent // on the mod event bus
public static void gatherData(GatherDataEvent.Client event) {
    event.createProvider(MyEquipmentInfoProvider::new);
}
```

</TabItem>
</Tabs>

## 装备渲染

装备信息通过 `EntityRenderer` 或其某个 `RenderLayer` 的渲染 function 中的 `EquipmentLayerRenderer` 渲染。`EquipmentLayerRenderer` 作为 render context 的一部分，通过 `EntityRendererProvider.Context#getEquipmentRenderer` 获取。如果需要 `EquipmentClientInfo`，也可以通过 `EntityRendererProvider.Context#getEquipmentAssets` 获取。

默认情况下，以下 layer 会渲染关联的 `EquipmentClientInfo.LayerType`：

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

`EquipmentLayerRenderer` 只有一个提交装备 layer 进行渲染的方法：`renderLayers`。

```java
// In some render method where EquipmentLayerRenderer equipmentLayerRenderer is available
this.equipmentLayerRenderer.renderLayers(
    // The layer type to render
    EquipmentClientInfo.LayerType.HUMANOID,
    // The resource key representing the EquipmentClientInfo JSON
    // This would be set in the `EQUIPPABLE` data component via `assetId`
    stack.get(DataComponents.EQUIPPABLE).assetId().orElseThrow(),
    // The model to apply the equipment info to
    // These are usually separate models from the entity model
    // and are separate ModelLayers linking to a LayerDefinition
    model,
    // The item stack representing the item being rendered as a model
    // This is only used to get the dyeable, foil, and armor trim information
    stack,
    // The pose stack used to render the model in the correct location
    poseStack,
    // The collector to submit the model data to
    collector,
    // The packed light coordinates
    lightCoords,
    // An absolute path of the texture to render when use_player_texture is true for one of the layer if not null
    // Represents an absolute location within the assets folder
    Identifier.fromNamespaceAndPath("examplemod", "textures/other_texture.png"),
    // The color of the model outline
    // Only used if the outline color is not 0 and the `RenderType` has or is an outline type
    outlineColor,
    // The starting order priority to submit the layers and trims, ticking up with each model submitted
    // By default, this is 1
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
