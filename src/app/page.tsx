import { buildProductDemo } from "../demo/product-demo";
import { ProductConsole } from "../presentation/product-console";

export default function Home() {
  return <ProductConsole model={buildProductDemo()} />;
}
