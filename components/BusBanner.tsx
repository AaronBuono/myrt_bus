'use client';

import { useEffect, useRef } from 'react';
import styles from './BusBanner.module.css';

type TreeLayout = [leftPct: number, size: number, shade: number];

const FAR_LAYOUT: TreeLayout[] = [
  [3, 28, 0], [9, 34, 1], [15, 26, 0], [22, 32, 1],
  [29, 24, 0], [36, 30, 1], [43, 28, 0], [50, 34, 1],
  [57, 26, 0], [64, 32, 1], [71, 28, 0], [78, 30, 1],
  [85, 26, 0], [92, 34, 1],
];

const NEAR_LAYOUT: TreeLayout[] = [
  [4, 58, 0], [12, 72, 1], [22, 62, 0], [33, 78, 1],
  [44, 56, 0], [55, 74, 1], [66, 64, 0], [78, 80, 1],
  [89, 60, 0],
];

function buildRow(rowEl: HTMLDivElement, layout: TreeLayout[], layer: 'far' | 'near') {
  layout.forEach(([leftPct, size, shade]) => {
    const t = document.createElement('div');
    t.className = styles.tree;
    t.style.left = leftPct + '%';
    t.style.setProperty('--w', size + 'px');
    t.style.setProperty('--h', size * 1.9 + 'px');
    t.style.setProperty('--trunk-h', Math.max(6, Math.round(size * 0.18)) + 'px');
    t.style.setProperty('--trunk-w', Math.max(4, Math.round(size * 0.16)) + 'px');

    const [c1, c2] = layer === 'far'
      ? shade
        ? ['var(--tree-far-a)', 'var(--tree-far-b)']
        : ['var(--tree-far-b)', 'var(--tree-far-a)']
      : shade
        ? ['var(--tree-near-a)', 'var(--tree-near-b)']
        : ['var(--tree-near-b)', 'var(--tree-near-a)'];

    t.style.setProperty('--c1', c1);
    t.style.setProperty('--c2', c2);
    t.innerHTML = `<div class="${styles.tier} ${styles.t1}"></div><div class="${styles.tier} ${styles.t2}"></div><div class="${styles.tier} ${styles.t3}"></div>`;
    rowEl.appendChild(t);
  });
}

export default function BusBanner() {
  const farA = useRef<HTMLDivElement>(null);
  const farB = useRef<HTMLDivElement>(null);
  const nearA = useRef<HTMLDivElement>(null);
  const nearB = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (farA.current)  buildRow(farA.current,  FAR_LAYOUT,  'far');
    if (farB.current)  buildRow(farB.current,  FAR_LAYOUT,  'far');
    if (nearA.current) buildRow(nearA.current, NEAR_LAYOUT, 'near');
    if (nearB.current) buildRow(nearB.current, NEAR_LAYOUT, 'near');
  }, []);

  return (
    <section className={styles.hero} aria-label="Animated bus driving through a pine forest">
      <div className={styles.sun} aria-hidden="true" />
      <div className={styles.hills} aria-hidden="true" />

      <div className={`${styles.trees} ${styles.far}`} aria-hidden="true">
        <div className={styles.row} ref={farA} />
        <div className={styles.row} ref={farB} />
      </div>

      <div className={styles.ground} aria-hidden="true" />

      <div className={`${styles.trees} ${styles.near}`} aria-hidden="true">
        <div className={styles.row} ref={nearA} />
        <div className={styles.row} ref={nearB} />
      </div>

      <div className={styles.road} aria-hidden="true">
        <div className={styles.dashes} />
      </div>

      <div className={styles['bus-wrap']} aria-hidden="true">
        <div className={styles['bus-shadow']} />
        <div className={styles['bus-body']}>
          <div className={styles.windows}>
            <div className={styles.w} />
            <div className={styles.w} />
            <div className={styles.w} />
            <div className={styles.w} />
            <div className={styles.w} />
          </div>
          <div className={styles.door} />
          <div className={styles['bus-stripe']} />
          <div className={styles['marker-rear']} />
          <div className={styles['marker-front']} />
          <div className={styles.headlight} />
          <div className={`${styles.bumper} ${styles.front}`} />
          <div className={`${styles.bumper} ${styles.rear}`} />
          <div className={styles.under} />
        </div>
        <div className={`${styles.wheel} ${styles.rear}`} />
        <div className={`${styles.wheel} ${styles.front}`} />
      </div>
    </section>
  );
}
