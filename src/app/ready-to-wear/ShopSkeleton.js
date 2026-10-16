import page from "./readytowear.module.css";
import s from "./shopSkeleton.module.css";

const bone = (...names) => [s.bone, ...names].join(" ");

/** Skeleton for the /ready-to-wear listing. Mirrors the real layout. */
export function ShopSkeleton({ count = 10 }) {
  return (
    <div className={page.container} aria-busy="true">
      <span className={s.srOnly} role="status">Loading ready-to-wear collection</span>
      <main className={page.shop}>
        <section className={`${page.collection} ${s.visual}`} aria-hidden="true">
          <div className={page.collectionHeading}>
            <div className={bone(s.headingTitle)}>
              <h2 className={s.reserved}>Find your next favourite</h2>
            </div>
            <div className={page.searchPanel}>
              <div className={bone(s.searchBone)} />
            </div>
          </div>

          <div className={page.categoryRail}>
            {["All", "Dresses", "Skirts", "Trousers", "Tops", "Jackets", "Accessories"].map((category) => (
              <div key={category} className={`${page.categoryButton} ${s.railItem}`}>
                <span className={s.bone}><span className={s.reserved}>{category}</span></span>
              </div>
            ))}
          </div>

          <div className={page.resultsBar}>
            <div className={page.resultControls}>
              <label><span className={bone(s.selectBone)} /></label>
              <label><span className={bone(s.selectBone)} /></label>
            </div>
          </div>

          <div className={page.products}>
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className={`${page.productCard} ${s.card}`}>
                <div className={`${page.productImage} ${s.bone}`} />
                <div className={page.productInfo}>
                  <div className={page.productCategory}><span className={bone(s.cardCategory)} /></div>
                  <div className={page.productName}><span className={bone(s.cardName)} /></div>
                  <div className={page.productMeta}><span className={`${page.productPrice} ${bone(s.cardPrice)}`} /></div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

/** Skeleton for a product detail page (/ready-to-wear/product/[slug]). */
export function ProductDetailSkeleton() {
  return (
    <div className={page.container} aria-busy="true">
      <span className={s.srOnly} role="status">Loading product</span>
      <main className={`${page.shop} ${s.visual}`} aria-hidden="true">
        <div className={bone(s.crumb)} />
        <div className={s.detail}>
          <div className={s.gallery}>
            <div className={s.thumbs}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={bone(s.thumb)} />
              ))}
            </div>
            <div className={bone(s.mainImage)} />
          </div>

          <div className={s.detailInfo}>
            <div className={bone(s.dCategory)} />
            <div className={bone(s.dTitle)} />
            <div className={bone(s.dTitleShort)} />
            <div className={bone(s.dPrice)} />
            <div className={bone(s.dLine)} />
            <div className={bone(s.dLine)} />
            <div className={bone(s.dLineShort)} />
            <div className={bone(s.dLabel)} />
            <div className={s.optionRow}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={bone(s.swatch)} />
              ))}
            </div>
            <div className={bone(s.dLabel)} />
            <div className={s.optionRow}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className={bone(s.option)} />
              ))}
            </div>
            <div className={bone(s.dButton)} />
            <div className={bone(s.dButtonGhost)} />
          </div>
        </div>
      </main>
    </div>
  );
}
