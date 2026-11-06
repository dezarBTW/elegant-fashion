import shellStyles from '@/app/admin/adminShell.module.css';
import styles from './DashboardSkeleton.module.css';

export default function DashboardSkeleton({ variant = 'admin', shell = false }) {
  const label = variant === 'admin' ? 'Loading admin dashboard' : variant === 'orders' ? 'Loading order items' : 'Loading your profile';
  const content = <div role="status" aria-label={label} aria-busy="true" className={styles.root}>
    <span className={styles.srOnly}>{label}…</span>
    <div aria-hidden="true">
      <div className={`${styles.bone} ${styles.title}`} />
      <div className={`${styles.bone} ${styles.subtitle}`} />
      <div className={variant === 'admin' ? styles.stats : styles.stack}>
        {Array.from({ length: variant === 'orders' ? 2 : 3 }, (_, index) => <div className={styles.card} key={index}>
          <div className={`${styles.bone} ${styles.label}`} />
          <div className={`${styles.bone} ${variant === 'admin' ? styles.number : styles.line}`} />
          <div className={`${styles.bone} ${styles.line}`} />
          {variant === 'profile' && <><div className={`${styles.bone} ${styles.line}`} /><div className={`${styles.bone} ${styles.input}`} /></>}
        </div>)}
      </div>
    </div>
  </div>;
  return shell ? <div className={shellStyles.shell}><div className={shellStyles.inner}>
    <div className={`${shellStyles.sidebar} ${styles.sidebar}`} aria-hidden="true">{Array.from({length:6},(_,index)=><div key={index} className={`${styles.bone} ${styles.line}`} />)}</div>
    <div className={shellStyles.content}>{content}</div>
  </div></div> : content;
}
