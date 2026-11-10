/**
 * Helper to resolve asset URLs for both dev (Vite) and production (WordPress)
 * Trong dev: trả về path tương đối (Vite dev server)
 * Trong production (WordPress): trả về URL từ icavietFormsConfig.assetsUrl
 */
export const useAssetUrl = () => {
  const getAssetUrl = (path: string): string => {
    // Remove leading slash nếu có
    const cleanPath = path.startsWith('/') ? path.slice(1) : path

    // Trong WordPress production, dùng assetsUrl từ PHP
    if (window.icavietFormsConfig?.assetsUrl) {
      return window.icavietFormsConfig.assetsUrl + cleanPath
    }

    // Trong Vite dev, trả về absolute path
    return '/' + cleanPath
  }

  return { getAssetUrl }
}
