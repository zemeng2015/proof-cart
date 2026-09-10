/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */
import type * as StorefrontAPI from '@shopify/hydrogen/storefront-api-types';

export type PcProductInfoFragment = (
  Pick<StorefrontAPI.Product, 'id' | 'title' | 'description' | 'onlineStoreUrl'>
  & { material?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'type' | 'value'>> }
);

export type PcVariantFragment = (
  Pick<StorefrontAPI.ProductVariant, 'id' | 'title' | 'availableForSale' | 'currentlyNotInStock' | 'quantityAvailable'>
  & { product: Pick<StorefrontAPI.Product, 'id'>, price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>, quantityRule: Pick<StorefrontAPI.QuantityRule, 'minimum' | 'maximum' | 'increment'> }
);

export type PcProductFragment = (
  Pick<StorefrontAPI.Product, 'id' | 'title' | 'description' | 'onlineStoreUrl'>
  & { variants: { nodes: Array<(
      Pick<StorefrontAPI.ProductVariant, 'id' | 'title' | 'availableForSale' | 'currentlyNotInStock' | 'quantityAvailable'>
      & { product: Pick<StorefrontAPI.Product, 'id'>, price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>, quantityRule: Pick<StorefrontAPI.QuantityRule, 'minimum' | 'maximum' | 'increment'> }
    )>, pageInfo: Pick<StorefrontAPI.PageInfo, 'hasNextPage'> }, material?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'type' | 'value'>> }
);

export type PcSearchQueryVariables = StorefrontAPI.Exact<{
  query: StorefrontAPI.Scalars['String']['input'];
  first: StorefrontAPI.Scalars['Int']['input'];
  country: StorefrontAPI.CountryCode;
  language: StorefrontAPI.LanguageCode;
}>;


export type PcSearchQuery = { search: { nodes: Array<{ __typename: 'Article' | 'Page' } | (
      { __typename: 'Product' }
      & Pick<StorefrontAPI.Product, 'id' | 'title' | 'description' | 'onlineStoreUrl'>
      & { variants: { nodes: Array<(
          Pick<StorefrontAPI.ProductVariant, 'id' | 'title' | 'availableForSale' | 'currentlyNotInStock' | 'quantityAvailable'>
          & { product: Pick<StorefrontAPI.Product, 'id'>, price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>, quantityRule: Pick<StorefrontAPI.QuantityRule, 'minimum' | 'maximum' | 'increment'> }
        )>, pageInfo: Pick<StorefrontAPI.PageInfo, 'hasNextPage'> }, material?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'type' | 'value'>> }
    )>, pageInfo: Pick<StorefrontAPI.PageInfo, 'hasNextPage'> } };

export type PcProductByIdQueryVariables = StorefrontAPI.Exact<{
  id: StorefrontAPI.Scalars['ID']['input'];
  country: StorefrontAPI.CountryCode;
  language: StorefrontAPI.LanguageCode;
}>;


export type PcProductByIdQuery = { product?: StorefrontAPI.Maybe<(
    Pick<StorefrontAPI.Product, 'id' | 'title' | 'description' | 'onlineStoreUrl'>
    & { variants: { nodes: Array<(
        Pick<StorefrontAPI.ProductVariant, 'id' | 'title' | 'availableForSale' | 'currentlyNotInStock' | 'quantityAvailable'>
        & { product: Pick<StorefrontAPI.Product, 'id'>, price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>, quantityRule: Pick<StorefrontAPI.QuantityRule, 'minimum' | 'maximum' | 'increment'> }
      )>, pageInfo: Pick<StorefrontAPI.PageInfo, 'hasNextPage'> }, material?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'type' | 'value'>> }
  )> };

export type PcVariantsQueryVariables = StorefrontAPI.Exact<{
  ids: Array<StorefrontAPI.Scalars['ID']['input']> | StorefrontAPI.Scalars['ID']['input'];
  country: StorefrontAPI.CountryCode;
  language: StorefrontAPI.LanguageCode;
}>;


export type PcVariantsQuery = { nodes: Array<StorefrontAPI.Maybe<{ __typename: 'AppliedGiftCard' | 'Article' | 'Blog' | 'Cart' | 'CartLine' | 'Collection' | 'Comment' | 'Company' | 'CompanyContact' | 'CompanyLocation' | 'ComponentizableCartLine' | 'ExternalVideo' | 'GenericFile' | 'Location' | 'MailingAddress' | 'Market' | 'MediaImage' | 'MediaPresentation' | 'Menu' | 'MenuItem' } | { __typename: 'Metafield' | 'Metaobject' | 'Model3d' | 'Order' | 'Page' | 'Product' | 'ProductOption' | 'ProductOptionValue' | 'Shop' | 'ShopPayInstallmentsFinancingPlan' | 'ShopPayInstallmentsFinancingPlanTerm' | 'ShopPayInstallmentsProductVariantPricing' | 'ShopPolicy' | 'TaxonomyCategory' | 'UrlRedirect' | 'Video' } | (
    { __typename: 'ProductVariant' }
    & Pick<StorefrontAPI.ProductVariant, 'id' | 'title' | 'availableForSale' | 'currentlyNotInStock' | 'quantityAvailable'>
    & { product: (
      Pick<StorefrontAPI.Product, 'id' | 'title' | 'description' | 'onlineStoreUrl'>
      & { material?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'type' | 'value'>> }
    ), price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>, quantityRule: Pick<StorefrontAPI.QuantityRule, 'minimum' | 'maximum' | 'increment'> }
  )>> };

interface GeneratedQueryTypes {
  "#graphql\n  query PcSearch($query: String!, $first: Int!, $country: CountryCode!, $language: LanguageCode!)\n  @inContext(country: $country, language: $language) {\n    search(query: $query, first: $first, types: [PRODUCT], sortKey: RELEVANCE, unavailableProducts: SHOW) {\n      nodes { __typename ... on Product { ...PcProduct } }\n      pageInfo { hasNextPage }\n    }\n  }\n  #graphql\n  fragment PcProduct on Product {\n    ...PcProductInfo\n    variants(first: 20) {\n      nodes { ...PcVariant }\n      pageInfo { hasNextPage }\n    }\n  }\n  #graphql\n  fragment PcProductInfo on Product {\n    id\n    title\n    description(truncateAt: 8192)\n    onlineStoreUrl\n    material: metafield(namespace: \"proof_cart\", key: \"material\") { type value }\n  }\n\n  #graphql\n  fragment PcVariant on ProductVariant {\n    id\n    title\n    product { id }\n    price { amount currencyCode }\n    availableForSale\n    currentlyNotInStock\n    quantityAvailable\n    quantityRule { minimum maximum increment }\n  }\n\n\n": {return: PcSearchQuery, variables: PcSearchQueryVariables},
  "#graphql\n  query PcProductById($id: ID!, $country: CountryCode!, $language: LanguageCode!)\n  @inContext(country: $country, language: $language) {\n    product(id: $id) { ...PcProduct }\n  }\n  #graphql\n  fragment PcProduct on Product {\n    ...PcProductInfo\n    variants(first: 20) {\n      nodes { ...PcVariant }\n      pageInfo { hasNextPage }\n    }\n  }\n  #graphql\n  fragment PcProductInfo on Product {\n    id\n    title\n    description(truncateAt: 8192)\n    onlineStoreUrl\n    material: metafield(namespace: \"proof_cart\", key: \"material\") { type value }\n  }\n\n  #graphql\n  fragment PcVariant on ProductVariant {\n    id\n    title\n    product { id }\n    price { amount currencyCode }\n    availableForSale\n    currentlyNotInStock\n    quantityAvailable\n    quantityRule { minimum maximum increment }\n  }\n\n\n": {return: PcProductByIdQuery, variables: PcProductByIdQueryVariables},
  "#graphql\n  query PcVariants($ids: [ID!]!, $country: CountryCode!, $language: LanguageCode!)\n  @inContext(country: $country, language: $language) {\n    nodes(ids: $ids) {\n      __typename\n      ... on ProductVariant { ...PcVariant product { ...PcProductInfo } }\n    }\n  }\n  #graphql\n  fragment PcVariant on ProductVariant {\n    id\n    title\n    product { id }\n    price { amount currencyCode }\n    availableForSale\n    currentlyNotInStock\n    quantityAvailable\n    quantityRule { minimum maximum increment }\n  }\n\n  #graphql\n  fragment PcProductInfo on Product {\n    id\n    title\n    description(truncateAt: 8192)\n    onlineStoreUrl\n    material: metafield(namespace: \"proof_cart\", key: \"material\") { type value }\n  }\n\n": {return: PcVariantsQuery, variables: PcVariantsQueryVariables},
}

interface GeneratedMutationTypes {
}

declare module '@shopify/hydrogen' {
  interface StorefrontQueries extends GeneratedQueryTypes {}
  interface StorefrontMutations extends GeneratedMutationTypes {}
}
