#ifndef BLUETOOTH_H
#define BLUETOOTH_H

#include <Arduino.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <functional>

// UUID-uri Nordic UART Service (NUS) - recunoscute de nRF Connect,
// Serial Bluetooth Terminal etc., deci se poate testa fara aplicatia voastra
#define BLE_SERVICE_UUID "6e400001-b5a3-f393-e0a9-e50e24dcca9e"
#define BLE_RX_UUID      "6e400002-b5a3-f393-e0a9-e50e24dcca9e" // telefon -> ESP (write)
#define BLE_TX_UUID      "6e400003-b5a3-f393-e0a9-e50e24dcca9e" // ESP -> telefon (notify)

#define BLE_MAX_COMANDA 32   // lungimea maxima a unei comenzi primite
#define BLE_MESAJ_CONECTARE "CONECTAT"

class Bluetooth : public BLEServerCallbacks, public BLECharacteristicCallbacks
{
  public:
    typedef std::function<void()> Eveniment;
    typedef std::function<void(String)> Comanda;

  private:
    const char* nume;
    BLEServer* server;
    BLECharacteristic* tx;
    BLECharacteristic* rx;
    BLE2902* cccd;              // descriptorul prin care telefonul cere notificari
    QueueHandle_t coada;        // comenzile primite, procesate in loop()

    volatile bool conectat;
    volatile bool evConectat;
    volatile bool evDeconectat;
    bool confirmareTrimisa;

    Eveniment cbConectare;
    Eveniment cbDeconectare;
    Comanda cbComanda;

    // apelate de stiva BLE (alt task FreeRTOS) - doar seteaza flag-uri
    void onConnect(BLEServer* s) override;
    void onDisconnect(BLEServer* s) override;
    void onWrite(BLECharacteristic* c) override;

  public:
    Bluetooth(const char* numeDispozitiv);
    void begin();
    void update();                      // de apelat in fiecare loop()
    bool esteConectat();
    bool trimite(const String& mesaj);  // trimite text catre telefon (notify)

    void laConectare(Eveniment cb);
    void laDeconectare(Eveniment cb);
    void laComanda(Comanda cb);
};

#endif
