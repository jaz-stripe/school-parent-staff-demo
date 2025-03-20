// components/ProductSelection.tsx
import React from 'react';
import styles from '../styles/ProductSelection.module.css';

interface Product {
  id: number;
  name: string;
  type: string;
  amount: number;
}

interface ProductSelectionProps {
  title: string;
  products: Product[];
  selectedItems: { [key: string]: number };
  keyPrefix: string;
  onItemChange: (key: string, increment: boolean) => void;
  onUpdate?: () => void;
  updateButtonText?: string;
  status?: string;
  isLoading?: boolean;
  emptyMessage?: string;
  showCreateInvoiceOption?: boolean;
  createInvoiceChecked?: boolean;
  onCreateInvoiceChange?: (checked: boolean) => void;
}

const ProductSelection: React.FC<ProductSelectionProps> = ({
  title,
  products,
  selectedItems,
  keyPrefix,
  onItemChange,
  onUpdate,
  updateButtonText = "Update",
  status,
  isLoading = false,
  emptyMessage = "No products available",
  showCreateInvoiceOption = false,
  createInvoiceChecked = false,
  onCreateInvoiceChange
}) => {
  const selectedCount = Object.values(selectedItems).reduce((sum, count) => sum + count, 0);
  const hasSelections = selectedCount > 0;

  return (
    <section className={styles.productSection}>
      <h2 className={styles.sectionTitle}>
        {title}
        {hasSelections && <span className={styles.selectionCount}>{selectedCount}</span>}
      </h2>
      
      {products.length > 0 ? (
        <div className={styles.itemsGrid}>
          {products.map(product => {
            const itemKey = `${keyPrefix}_${product.id}`;
            const quantity = selectedItems[itemKey] || 0;
            
            return (
              <div key={product.id} className={styles.itemCard}>
                <div className={styles.itemInfo}>
                  <span className={styles.itemName}>{product.name}</span>
                  <span className={styles.itemPrice}>${(product.amount / 100).toFixed(2)}</span>
                </div>
                
                <div className={styles.quantityControls}>
                  <button
                    className={styles.decrementButton}
                    onClick={() => onItemChange(itemKey, false)}
                    disabled={quantity === 0}
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <span>{quantity}</span>
                  <button
                    className={styles.incrementButton}
                    onClick={() => onItemChange(itemKey, true)}
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className={styles.emptyState}>{emptyMessage}</p>
      )}
      
      {hasSelections && onUpdate && (
        <div className={styles.updateSection}>
          {showCreateInvoiceOption && (
            <div className={styles.invoiceOption}>
              <label className={styles.invoiceCheckboxLabel}>
                <input 
                  type="checkbox"
                  checked={createInvoiceChecked}
                  onChange={(e) => onCreateInvoiceChange && onCreateInvoiceChange(e.target.checked)}
                  className={styles.invoiceCheckbox}
                />
                Create invoice now and charge payment method
              </label>
            </div>
          )}
          
          <button
            onClick={onUpdate}
            className={styles.updateButton}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : updateButtonText}
          </button>
          
          {status && (
            <p className={status.includes('success') ? styles.successStatus : styles.errorStatus}>
              {status}
            </p>
          )}
        </div>
      )}
    </section>
  );
};

export default ProductSelection;
