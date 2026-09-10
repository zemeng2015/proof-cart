const PRODUCT_INFO = `#graphql
  fragment PcProductInfo on Product {
    id
    title
    description(truncateAt: 8192)
    onlineStoreUrl
    material: metafield(namespace: "proof_cart", key: "material") { type value }
  }
` as const;

const VARIANT = `#graphql
  fragment PcVariant on ProductVariant {
    id
    title
    product { id }
    price { amount currencyCode }
    availableForSale
    currentlyNotInStock
    quantityAvailable
    quantityRule { minimum maximum increment }
  }
` as const;

const PRODUCT = `#graphql
  fragment PcProduct on Product {
    ...PcProductInfo
    variants(first: 20) {
      nodes { ...PcVariant }
      pageInfo { hasNextPage }
    }
  }
  ${PRODUCT_INFO}
  ${VARIANT}
` as const;

export const STOREFRONT_SEARCH = `#graphql
  query PcSearch($query: String!, $first: Int!, $country: CountryCode!, $language: LanguageCode!)
  @inContext(country: $country, language: $language) {
    search(query: $query, first: $first, types: [PRODUCT], sortKey: RELEVANCE, unavailableProducts: SHOW) {
      nodes { __typename ... on Product { ...PcProduct } }
      pageInfo { hasNextPage }
    }
  }
  ${PRODUCT}
` as const;

export const STOREFRONT_PRODUCT = `#graphql
  query PcProductById($id: ID!, $country: CountryCode!, $language: LanguageCode!)
  @inContext(country: $country, language: $language) {
    product(id: $id) { ...PcProduct }
  }
  ${PRODUCT}
` as const;

export const STOREFRONT_VARIANTS = `#graphql
  query PcVariants($ids: [ID!]!, $country: CountryCode!, $language: LanguageCode!)
  @inContext(country: $country, language: $language) {
    nodes(ids: $ids) {
      __typename
      ... on ProductVariant { ...PcVariant product { ...PcProductInfo } }
    }
  }
  ${VARIANT}
  ${PRODUCT_INFO}
` as const;
