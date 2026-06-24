import { registerPageSetup } from './pageRegistry'
import { setupHomePageData } from './pages/home'
import { setupCategoryPageData } from './pages/category'
import { setupWikiTabPageData } from './pages/wikiTab'
import { setupWikiDetailPageData } from './pages/wikiDetail'
import { setupCustomerSearchPageData } from './pages/customerSearch'
import { setupCustomerGoodsListPageData } from './pages/customerGoodsList'
import { setupCustomizePickPageData } from './pages/customizePick'
import { setupMerchantGoodsListPageData } from './pages/merchantGoodsList'
import { setupMerchantGoodsStockInPageData } from './pages/merchantGoodsStockIn'
import { setupMerchantGoodsStockInImportPageData } from './pages/merchantGoodsStockInImport'
import { setupFlowerPickerPageData } from './pages/flowerPicker'
import { setupGoodsDetailPageData } from './pages/goodsDetail'
import { setupMerchantCategoryListPageData } from './pages/merchantCategoryList'
import { setupMerchantGoodsPickerPageData } from './pages/merchantGoodsPicker'
import { setupSalesStrategyEditPageData } from './pages/salesStrategyEdit'

let registered = false

/** 注册所有页面 setup（模块加载时执行一次） */
export function registerAllPageSetups() {
  if (registered) return
  registered = true

  registerPageSetup('pages/home/index', setupHomePageData)
  registerPageSetup('pages/category/index', setupCategoryPageData)
  registerPageSetup('pages/wiki/index', setupWikiTabPageData)
  registerPageSetup('pagesCustomer/wiki/detail', setupWikiDetailPageData)
  registerPageSetup('pagesCustomer/search/index', setupCustomerSearchPageData)
  registerPageSetup('pagesCustomer/goods/list', setupCustomerGoodsListPageData)
  registerPageSetup('pagesCustomer/goods/detail', setupGoodsDetailPageData)
  registerPageSetup('pagesCustomer/customize/pick', setupCustomizePickPageData)
  registerPageSetup('pagesMerchant/goods/list', setupMerchantGoodsListPageData)
  registerPageSetup('pagesMerchant/goods/stock-in', setupMerchantGoodsStockInPageData)
  registerPageSetup('pagesMerchant/goods/stock-in-import', setupMerchantGoodsStockInImportPageData)
  registerPageSetup('pagesMerchant/category/list', setupMerchantCategoryListPageData)
  registerPageSetup('pagesMerchant/flower/picker', setupFlowerPickerPageData)
  registerPageSetup('pagesMerchant/shop/goods-picker', setupMerchantGoodsPickerPageData)
  registerPageSetup('pagesMerchant/shop/sales-strategy/edit', setupSalesStrategyEditPageData)
}
