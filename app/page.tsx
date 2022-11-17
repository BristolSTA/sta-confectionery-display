import '../styles/globals.css'
import { CatalogObject, Client, Environment, CatalogItem, CatalogImage } from "square";
import Image from "next/image";

const DRINKS_CATEGORY = "HKY5KICRT6OKZB6MC2CTWVW6";
const SNACKS_CATEGORY = "N726HTMVPHM5YZTYZMWJSO3Z"

interface Item {
  id: string,
  item: CatalogItem,
  image: CatalogImage,
}

const priceFormatter = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
});

function getPrice(item: CatalogItem): number | null {
  return Number(item.variations?.[0].itemVariationData?.priceMoney?.amount)
}

function getFormattedPrice(item: CatalogItem): string | null {
  const price = getPrice(item);
  if (price == null) return null;
  if (price < 100) return `${price}p`
  if (price % 100 == 0) return `£${price / 100}`
  return priceFormatter.format(price / 100);
}

function getItemImage(item: CatalogItem, images: CatalogObject[]): CatalogImage | null {
  const imageId = item.imageIds?.[0];
  if (imageId == null) return null;
  return images.find(image => image.id == imageId)?.imageData ?? null;
}

async function fetchCatalogItems(categoryId: string): Promise<Item[]> {
  const client = new Client({
    accessToken: process.env.SQUARE_ACCESS_TOKEN,
    environment: Environment.Production,
  });

  const listLocationsResponse = await client.catalogApi.searchCatalogObjects({
    objectTypes: ["ITEM"],
    query: {
      exactQuery: {
        attributeName: "category_id",
        attributeValue: categoryId
      }
    },
    includeRelatedObjects: true
  });
  const items = listLocationsResponse.result.objects ?? [];
  const relatedObjects = listLocationsResponse.result.relatedObjects ?? [];


  const images = relatedObjects.filter(object => object.type == "IMAGE")

  // Sort items by name alphabetically, and then into ascending price order
  items.sort((a, b) => {
    return (a.itemData?.name ?? '').localeCompare(b.itemData?.name ?? '')
  }).sort((a, b) => {
    let aValue = 0;
    let bValue = 0;

    if (a.itemData) aValue = getPrice(a.itemData) ?? 0
    if (b.itemData) bValue = getPrice(b.itemData) ?? 0

    return aValue - bValue
  })



  return items.map(item => {
    const itemData = item.itemData!;
    const image = getItemImage(item.itemData!, images);
    return {
      id: item.id,
      item: itemData,
      image: image!,
    }
  });
}

function ItemCard(props: { item: Item }) {
  const { item } = props;
  return (
    <div className="w-full relative">
      {
        item.image?.url != null && <div>
          <Image className="rounded-t-lg" src={item.image!.url!} alt="product image" height={250} width={250} />
        </div>
      }
      <div className="absolute top-0 bg-blue-500 text-white p-2 rounded text-2xl">
        <div className="flex justify-between items-center">
          {getFormattedPrice(item.item)}
        </div>
      </div>
    </div>
  );
}

function ItemCategorySet(props: { items: Item[], name: string }) {
  const { items, name } = props;
  return (
    <div>
      <h2 className="text-6xl font-bold text-center mb-5 text-white">{name}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 auto-cols-max">
        {items.map(item => {
          return <ItemCard key={item.id} item={item} />;
        })}
      </div>
    </div>
  );
}


export default async function Page() {
  const snackItems = await fetchCatalogItems(SNACKS_CATEGORY);
  const drinkItems = await fetchCatalogItems(DRINKS_CATEGORY);
  return <div className='h-screen bg-gray-700'>
    <div className='flex gap-x-10 px-10'>
      <ItemCategorySet name="Snacks" items={snackItems} />
      <ItemCategorySet name="Soft Drinks" items={drinkItems} />
    </div>
  </div>;
}
