import AddProductForm from "@/components/add-product/AddProductForm";

export const metadata = {
  title: "Edit product · Shop My Band Admin",
};

export default function EditProductPage({ params }) {
  return <AddProductForm productId={params.id} />;
}
