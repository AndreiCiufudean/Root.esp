#include "Bluetooth.h"

Bluetooth::Bluetooth(const char* numeDispozitiv)
  : nume(numeDispozitiv), server(nullptr), tx(nullptr), rx(nullptr),
    cccd(nullptr), coada(nullptr), conectat(false), evConectat(false),
    evDeconectat(false), confirmareTrimisa(false) {}

void Bluetooth::begin()
{
  coada = xQueueCreate(5, BLE_MAX_COMANDA);

  BLEDevice::init(nume);
  server = BLEDevice::createServer();
  server->setCallbacks(this);

  BLEService* serviciu = server->createService(BLE_SERVICE_UUID);

  // ESP -> telefon
  tx = serviciu->createCharacteristic(
         BLE_TX_UUID,
         BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY);
  cccd = new BLE2902();
  tx->addDescriptor(cccd);

  // telefon -> ESP
  rx = serviciu->createCharacteristic(
         BLE_RX_UUID,
         BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_WRITE_NR);
  rx->setCallbacks(this);

  serviciu->start();

  BLEAdvertising* adv = BLEDevice::getAdvertising();
  adv->addServiceUUID(BLE_SERVICE_UUID);
  adv->setScanResponse(true);
  BLEDevice::startAdvertising();

  Serial.print("BLE pornit, nume: ");
  Serial.println(nume);
}

// ---------- callback-uri din stiva BLE (nu apelam cod de-al nostru aici) ----------

void Bluetooth::onConnect(BLEServer* s)
{
  conectat = true;
  evConectat = true;
}

void Bluetooth::onDisconnect(BLEServer* s)
{
  conectat = false;
  evDeconectat = true;
  BLEDevice::startAdvertising();   // fara asta telefonul nu se mai poate reconecta
}

void Bluetooth::onWrite(BLECharacteristic* c)
{
  auto valoare = c->getValue();    // std::string (core 2.x) sau String (core 3.x)
  char buf[BLE_MAX_COMANDA] = {0};
  size_t n = valoare.length();
  if (n >= BLE_MAX_COMANDA) n = BLE_MAX_COMANDA - 1;
  memcpy(buf, valoare.c_str(), n);
  if (coada) xQueueSend(coada, buf, 0);
}

// ---------- rulate din loop() ----------

void Bluetooth::update()
{
  if (evConectat)
  {
    evConectat = false;
    confirmareTrimisa = false;
    tx->setValue((uint8_t*)BLE_MESAJ_CONECTARE, strlen(BLE_MESAJ_CONECTARE));
    Serial.println("BLE: telefon conectat");
    if (cbConectare) cbConectare();
  }

  if (evDeconectat)
  {
    evDeconectat = false;
    Serial.println("BLE: telefon deconectat");
    if (cbDeconectare) cbDeconectare();
  }

  // Confirmarea se trimite abia cand telefonul s-a abonat la notificari,
  // altfel s-ar pierde (aplicatia se aboneaza la cateva sute de ms dupa conectare)
  if (conectat && !confirmareTrimisa && cccd->getNotifications())
  {
    trimite(BLE_MESAJ_CONECTARE);
    confirmareTrimisa = true;
  }

  char buf[BLE_MAX_COMANDA];
  while (coada && xQueueReceive(coada, buf, 0) == pdTRUE)
  {
    String comanda(buf);
    comanda.trim();                // scoate \r\n trimise de unele aplicatii
    if (comanda.length() == 0) continue;
    Serial.print("BLE comanda: ");
    Serial.println(comanda);
    if (cbComanda) cbComanda(comanda);
  }
}

bool Bluetooth::esteConectat()
{
  return conectat;
}

bool Bluetooth::trimite(const String& mesaj)
{
  if (!conectat) return false;
  tx->setValue((uint8_t*)mesaj.c_str(), mesaj.length());
  tx->notify();
  return true;
}

void Bluetooth::laConectare(Eveniment cb)   { cbConectare = cb; }
void Bluetooth::laDeconectare(Eveniment cb) { cbDeconectare = cb; }
void Bluetooth::laComanda(Comanda cb)       { cbComanda = cb; }
