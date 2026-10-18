/** Select used by the admin order queue (server page + realtime refetch). */
export const ORDER_SELECT = "*, order_items(*), apartment:apartments(entrance, floor, number), resident:residents(name, phone)";
