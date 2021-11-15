class MessageStore {
  getItem: (key: string) => Promise<any | null>;
  setItem: (key: string, value: any) => Promise<void>;
  deleteItem: (key: string) => Promise<void>;

  constructor({ setItem, getItem, deleteItem }: { 
    setItem: (key: string, value: any) => Promise<void>,
    getItem: (key: string) => Promise<any | null>,
    deleteItem: (key: string) => Promise<void>
  }) { 
    this.setItem = setItem;
    this.getItem = getItem;
    this.deleteItem = deleteItem;
  }
}

export default MessageStore;
