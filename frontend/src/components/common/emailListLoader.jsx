import "./emailListLoader.css";

/**
 * Skeleton loader for EmailListItem.
 * Render a list of these (e.g. 6-8) while emails are loading.
 *
 * Usage:
 *   {Array.from({ length: 8 }).map((_, i) => (
 *     <EmailListItemSkeleton key={i} />
 *   ))}
 */
function EmailListItemSkeleton() {
  return (
    <div className="clb-email-item clb-email-item--skeleton" aria-hidden="true">
      <span className="clb-skeleton clb-skeleton--avatar" />

      <span className="clb-email-item__body">
        <span className="clb-email-item__top">
          <span className="clb-skeleton clb-skeleton--name" />
          <span className="clb-skeleton clb-skeleton--time" />
        </span>

        <span className="clb-skeleton clb-skeleton--subject" />

        <span className="clb-skeleton clb-skeleton--snippet" />
      </span>
    </div>
  );
}

export default EmailListItemSkeleton;