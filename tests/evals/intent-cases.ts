/** Expected outcomes are authored independently of the planner's ranking code. */
export type IntentCase = {
  id: string;
  scenario: string;
  intent: Record<string, unknown>;
  catalog?: 'all';
  expected: {variants: string[]; amounts: string[]; exclusion?: string; notices?: string[]};
};
const usd = (amount: string) => ({amount, currencyCode: 'USD'});
export const intentCases: IntentCase[] = [
  {id: 'I01', scenario: 'One cup chooses the first equal-price variant', intent: {query: 'cup', currency: 'USD'}, expected: {variants: ['cup-blue'], amounts: ['19.999']}},
  {id: 'I02', scenario: 'Two cups preserve fractional precision', intent: {query: 'cup', currency: 'USD', quantity: 2}, expected: {variants: ['cup-blue'], amounts: ['39.998']}},
  {id: 'I03', scenario: 'Ten cups remain below the reported stock', intent: {query: 'cup', currency: 'USD', quantity: 10}, expected: {variants: ['cup-blue'], amounts: ['199.99']}},
  {id: 'I04', scenario: 'A rounded-down budget cannot afford the exact cup price', intent: {query: 'cup', currency: 'USD', maxTotal: usd('19.99')}, expected: {variants: [], amounts: [], exclusion: 'over_budget'}},
  {id: 'I05', scenario: 'An exact boundary budget can afford the cup', intent: {query: 'cup', currency: 'USD', maxTotal: usd('19.999')}, expected: {variants: ['cup-blue'], amounts: ['19.999']}},
  {id: 'I06', scenario: 'Budget applies to quantity subtotal, not unit price', intent: {query: 'cup', currency: 'USD', quantity: 2, maxTotal: usd('39.997')}, expected: {variants: [], amounts: [], exclusion: 'over_budget'}},
  {id: 'I07', scenario: 'Bottle at unit quantity', intent: {query: 'bottle', currency: 'USD'}, expected: {variants: ['bottle'], amounts: ['28.5']}},
  {id: 'I08', scenario: 'Bottle quantity at inventory boundary', intent: {query: 'bottle', currency: 'USD', quantity: 8}, expected: {variants: ['bottle'], amounts: ['228']}},
  {id: 'I09', scenario: 'Bottle quantity above inventory is excluded', intent: {query: 'bottle', currency: 'USD', quantity: 9}, expected: {variants: [], amounts: [], exclusion: 'insufficient_inventory'}},
  {id: 'I10', scenario: 'Unknown bag inventory is disclosed rather than fabricated', intent: {query: 'bag', currency: 'USD'}, expected: {variants: ['bag'], amounts: ['14'], notices: ['inventory_unknown', 'backorder_status_unknown']}},
  {id: 'I11', scenario: 'Unknown bag inventory remains unknown at quantity ten', intent: {query: 'bag', currency: 'USD', quantity: 10}, expected: {variants: ['bag'], amounts: ['140'], notices: ['inventory_unknown']}},
  {id: 'I12', scenario: 'Known zero price is a valid fact', intent: {query: 'guide', currency: 'USD'}, expected: {variants: ['guide'], amounts: ['0'], notices: ['inventory_unknown']}},
  {id: 'I13', scenario: 'A zero budget admits a genuinely free item', intent: {query: 'guide', currency: 'USD', quantity: 3, maxTotal: usd('0')}, expected: {variants: ['guide'], amounts: ['0']}},
  {id: 'I14', scenario: 'Unknown price cannot become a priced proposal', intent: {query: 'notebook', currency: 'USD'}, expected: {variants: [], amounts: [], exclusion: 'unknown_price'}},
  {id: 'I15', scenario: 'Explicit unavailable item is excluded', intent: {query: 'scarf', currency: 'USD'}, expected: {variants: [], amounts: [], exclusion: 'unavailable'}},
  {id: 'I16', scenario: 'Minimum and increment rule reject one napkin', intent: {query: 'napkin', currency: 'USD'}, expected: {variants: [], amounts: [], exclusion: 'quantity_rule_violation'}},
  {id: 'I17', scenario: 'Backorder marker does not override known zero inventory', intent: {query: 'napkin', currency: 'USD', quantity: 2}, expected: {variants: [], amounts: [], exclusion: 'insufficient_inventory'}},
  {id: 'I18', scenario: 'Cotton search returns two independent alternatives ranked by price', intent: {query: 'cotton', currency: 'USD'}, expected: {variants: ['bag', 'injection'], amounts: ['14', '24']}},
  {id: 'I19', scenario: 'Exact material rejects cotton canvas when cotton is requested', intent: {query: 'cotton', currency: 'USD', material: 'Cotton'}, expected: {variants: ['injection'], amounts: ['24'], exclusion: 'material_mismatch'}},
  {id: 'I20', scenario: 'Trimmed case-insensitive material match', intent: {query: ' cup ', currency: 'USD', material: '  GLAZED CERAMIC  '}, expected: {variants: ['cup-blue'], amounts: ['19.999']}},
  {id: 'I21', scenario: 'A different known material is a hard mismatch', intent: {query: 'cup', currency: 'USD', material: 'Steel'}, expected: {variants: [], amounts: [], exclusion: 'material_mismatch'}},
  {id: 'I22', scenario: 'Missing material cannot satisfy a hard constraint', intent: {query: 'guide', currency: 'USD', material: 'Cotton'}, expected: {variants: [], amounts: [], exclusion: 'material_unknown'}},
  {id: 'I23', scenario: 'Currency mismatch is not silently converted', intent: {query: 'cup', currency: 'CAD'}, expected: {variants: [], amounts: [], exclusion: 'currency_mismatch'}},
  {id: 'I24', scenario: 'No matching product yields no alternatives', intent: {query: 'nonexistent-xyz', currency: 'USD'}, expected: {variants: [], amounts: []}},
  {id: 'I25', scenario: 'Many eligible products are capped at three distinct alternatives', catalog: 'all', intent: {query: 'all evaluation products', currency: 'USD'}, expected: {variants: ['guide', 'bag', 'cup-blue'], amounts: ['0', '14', '19.999'], exclusion: 'candidate_limit'}},
  {id: 'I26', scenario: 'Budget remains per alternative rather than aggregating alternatives', catalog: 'all', intent: {query: 'all evaluation products', currency: 'USD', maxTotal: usd('20')}, expected: {variants: ['guide', 'bag', 'cup-blue'], amounts: ['0', '14', '19.999'], exclusion: 'over_budget'}},
];
