import '../styles/globals.css'
import { CatalogObject, Client, Environment, CatalogItem, CatalogImage } from "square";
import Image from "next/image";

const DISCONTINUED_CATEGORIES = ["E6BBDSBEAJJJKILQH2WQAFU6"];

interface Item {
  id: string,
  item: CatalogItem,
  image: CatalogImage | null,
}

const priceFormatter = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
});

function getFormattedPrice(item: CatalogItem): string | null {
  const price = item.variations?.[0].itemVariationData?.priceMoney?.amount;
  if (price == null) return null;
  return priceFormatter.format(Number(price) / 100);
}

function getItemImage(item: CatalogItem, images: Map<string, CatalogObject>): CatalogImage | null {
    const imageId = item.imageIds?.[0];
    if (imageId == null) return null;
    return images.get(imageId)?.imageData ?? null;
}

async function fetchCatalogItems(): Promise<Item[]> {
  const client = new Client({
    accessToken: process.env.SQUARE_ACCESS_TOKEN,
    environment: Environment.Production,
  });

  const listLocationsResponse = await client.catalogApi.listCatalog(undefined, "ITEM,IMAGE");
  const objects = listLocationsResponse.result.objects ?? [];


  type CatalogData = { images: Map<string, CatalogObject>, items: CatalogObject[] };
  const { images, items }: CatalogData = objects.reduce((data, object) => {
    if (object.type === "IMAGE") data.images.set(object.id, object)
    else if (object.type === "ITEM") {
        if (object.itemData!.categoryId != null && !DISCONTINUED_CATEGORIES.includes(object.itemData!.categoryId)) {
          data.items.push(object);
        }
    }
    return data;
  }, { images: new Map(), items: [] } as CatalogData)


  return items.map(item => {
      const itemData = item.itemData!;
      return {
          id: item.id,
          item: itemData,
          image: getItemImage(itemData, images),
      } 
  });
}

function ItemCard(props: { item: Item }) {
  const { item } = props;
  return (<div className="w-full max-w-sm rounded-lg shadow-md">
    {
      item.image?.url != null && <div>
        <Image className="p-8 rounded-t-lg" src={item.image!.url!} alt="product image" height={250} width={250}/>
      </div>
    }
    <div className="px-5 pb-5">
        <h5 className="text-xl font-semibold tracking-tight text-gray-900">{item.item.name}</h5>
        <div className="flex justify-between items-center">
            <span className="text-3xl font-bold text-gray-900">{getFormattedPrice(item.item)}</span>
        </div>
    </div>
  </div>);
}

export default async function Page() {
  const items = await fetchCatalogItems();
  return <div className='h-screen'>
    <div className="grid grid-cols-5 auto-cols-max">
      { items.map(item => {
          return <ItemCard key={item.id} item={item}/>;
      }) }
    </div>
  </div>;
}
