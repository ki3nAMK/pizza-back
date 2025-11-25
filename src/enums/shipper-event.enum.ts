export enum ShipperEvent {
  SHIPPER_UPDATE_LOCATION = 'shipper.updateLocation',
  REQUEST_SHIPPER_UPDATE_LOCATION = 'shipper.requestUpdateLocatiom',

  REQUEST_SHIPPER_UPDATE_LOCATION_NEW_ORDER = 'shipper.requestUpdateLocationNewOrder',
  SHIPPER_UPDATE_LOCATION_NEW_ORDER = 'shipper.updateLocationNewOrder',

  SHIPPER_UPDATE_LOCATION_INTERNAL = 'shipper.updateLocationInternal',

  ORDER_DELIVERING = 'order.delivering',

  ORDER_DECIDE_SHIPPER = 'order.decideShipper',
}
