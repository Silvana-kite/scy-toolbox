export interface CatalogTool {
  toolId: string
  name: string
  description: string
  icon: string
  symbol: string
  categoryId: string
  categoryName: string
  categorySymbol: string
  categoryOrder: number
  route: string
}

export interface CatalogResponse { tools: CatalogTool[] }
export interface HomeResponse extends CatalogResponse { source: 'personal' | 'global' }
