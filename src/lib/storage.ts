/**
 * Обёртка над localStorage: в приватном режиме Safari и при отключённом storage
 * вызовы бросают исключение, а приложение должно продолжать работать.
 */
export const safeStorage = {
  get(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // нет доступа к storage — работаем без персистентности
    }
  },
  remove(key: string): void {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // см. выше
    }
  },
};
