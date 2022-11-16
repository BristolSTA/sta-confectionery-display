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

function getFormattedPrice(item: CatalogItem): string | null {
  const price = Number(item.variations?.[0].itemVariationData?.priceMoney?.amount);
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
      <div className="absolute top-0 bg-blue-500 text-white p-2 rounded text-3xl">
        <div className="flex justify-between items-center">
          {getFormattedPrice(item.item)}
        </div>
      </div>
    </div>
  );
}

export default async function Page() {
  const snackItems = await fetchCatalogItems(SNACKS_CATEGORY);
  const drinkItems = await fetchCatalogItems(DRINKS_CATEGORY);
  return <div className='h-screen'>
    <div className='flex'>
      <div className="grid grid-cols-1 sm:grid-cols-6 auto-cols-max">
        {snackItems.map(item => {
          return <ItemCard key={item.id} item={item} />;
        })}
      </div><div className="grid grid-cols-1 sm:grid-cols-6 auto-cols-max">
        {drinkItems.map(item => {
          return <ItemCard key={item.id} item={item} />;
        })}
      </div>
    </div>
  </div>;
}
