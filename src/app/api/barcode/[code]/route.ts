import { NextResponse } from "next/server";
import { citationMap } from "@/lib/citations";

type OpenFdaNdcResult = {
  proprietary_name?: string;
  generic_name?: string;
  labeler_name?: string;
  dosage_form?: string;
  route?: string[];
  active_ingredients?: Array<{
    name?: string;
    strength?: string;
  }>;
  package_ndc?: string[];
  product_ndc?: string;
};

async function queryOpenFda(search: string) {
  const url = `https://api.fda.gov/drug/ndc.json?search=${encodeURIComponent(search)}&limit=1`;
  const response = await fetch(url, { next: { revalidate: 60 * 60 } });
  if (!response.ok) {
    return null;
  }
  const data = (await response.json()) as { results?: OpenFdaNdcResult[] };
  return data.results?.[0] ?? null;
}

async function queryOpenFoodFacts(code: string) {
  const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json`, {
    next: { revalidate: 60 * 60 },
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as {
    status?: number;
    product?: {
      product_name?: string;
      brands?: string;
      categories?: string;
      image_url?: string;
    };
  };

  if (data.status !== 1 || !data.product) {
    return null;
  }

  return data.product;
}

export async function GET(_: Request, context: { params: Promise<{ code: string }> }) {
  const params = await context.params;
  const rawCode = params.code;
  const normalized = rawCode.replace(/[^0-9-]/g, "").trim();

  if (!normalized) {
    return NextResponse.json({ error: "A barcode value is required" }, { status: 400 });
  }

  const ndcByPackage = await queryOpenFda(`package_ndc:\"${normalized}\"`);
  const ndcByProduct = ndcByPackage ?? (await queryOpenFda(`product_ndc:\"${normalized}\"`));

  if (ndcByProduct) {
    return NextResponse.json({
      source: citationMap.openfda,
      resultType: "medication",
      item: {
        name: ndcByProduct.proprietary_name ?? ndcByProduct.generic_name ?? "Unknown medication",
        genericName: ndcByProduct.generic_name ?? null,
        labeler: ndcByProduct.labeler_name ?? null,
        dosageForm: ndcByProduct.dosage_form ?? null,
        route: ndcByProduct.route ?? [],
        activeIngredients: ndcByProduct.active_ingredients ?? [],
        packageNdc: ndcByProduct.package_ndc ?? [],
        productNdc: ndcByProduct.product_ndc ?? null,
      },
    });
  }

  const product = await queryOpenFoodFacts(normalized);
  if (product) {
    return NextResponse.json({
      source: {
        id: "openfoodfacts",
        title: "Open Food Facts API",
        url: "https://world.openfoodfacts.org/data",
        publisher: "Open Food Facts",
        checkedAt: "2026-05-03",
      },
      resultType: "consumer-product",
      item: {
        name: product.product_name ?? "Unknown product",
        brand: product.brands ?? null,
        categories: product.categories ?? null,
        imageUrl: product.image_url ?? null,
      },
    });
  }

  return NextResponse.json(
    {
      resultType: "none",
      error: "No matching medication or product found for that barcode.",
      source: citationMap.openfda,
    },
    { status: 404 }
  );
}
