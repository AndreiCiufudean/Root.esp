#include "SenzorDHT11.h"
#include "SenzorLumina.h"
#include "SenzorUmiditateSol.h"
#include "Mosfet.h"
#include "LEDURI.h"

#define PIN_DHT11 16  //GPIO16 I/O digitala
#define PIN_LUMINA 34  //GPIO34 intrare analogica
#define PIN_SOL 33  //GPIO33 intrare analogica
#define PIN_POMPA 18  //GPIO18 I/O digitala + generare semnal PWM
#define PIN_VENTILATOR 19  //GPIO19 I/O digitala + generare semnal PWM
#define LED_R 25 // iesire digitala/ PWM
#define LED_G 26 // iesire digitala/ PWM
#define LED_B 27 // iesire digitala/ PWM
#define LED_Y 14 // iesire digitala/ PWM

SenzorLumina s_lumina(PIN_LUMINA);
SenzorUmiditateSol s_umiditate_sol(PIN_SOL);
SenzorDHT11 s_dht11(PIN_DHT11, DHT11);
Mosfet pompa(PIN_POMPA);
Mosfet ventilator(PIN_VENTILATOR);
LEDURI red(LED_R);
LEDURI green(LED_G);
LEDURI blue(LED_B);
LEDURI yellow(LED_Y);

void setup() {
  Serial.begin(115200);
  s_lumina.begin();
  s_umiditate_sol.begin();
  s_dht11.begin();
  pompa.begin();
  pompa.opreste();
  ventilator.begin();
  ventilator.opreste();
  red.begin();
  red.opreste();
  green.begin();
  green.opreste();
  blue.begin();
  blue.opreste();
  yellow.begin();
  yellow.opreste();
}

const int maxim_udari=10;
const float temp_max=26.0;
const float threshold_temp=2.0; // marja de toleranta a temperaturii maxime
const int uscat=30; // sol cu umiditate <=30 -> sol uscat
const int ideal=45; // sol cu umiditate >30 && <70 -> sol cu umiditate ideala
const int ud=70; // sol cu umiditate >=70 && <=100 -> sol cu umiditate prea mare

void VerificaLumina(int lux)
{
  if(lux<=10)
  {
    Serial.println("Planta nu primeste lumina.");
  }
  else if(lux>10 && lux<=40){
    Serial.println("Planta nu primeste destula lumina.");
  }
  else if(lux>40 && lux<=75){
    Serial.println("Planta primeste cantitatea ideala de lumina.");
  }
  else if(lux>75 && lux<=100){
    Serial.println("Lumina foarte puternica. Verifica sol!"); //solul se poate usca mai repede
  }
}

void loop() {
  int umiditate_sol;
  float temp, lux;

  umiditate_sol=s_umiditate_sol.CitireUmiditateSol();
  if(umiditate_sol<uscat)
  {
    int ct=0;
    Serial.println("Sol uscat.");
    while(umiditate_sol<ideal && ct<maxim_udari)
    {
      blue.porneste();
      pompa.porneste();
      delay(100);
      ct++;
      umiditate_sol=s_umiditate_sol.CitireUmiditateSol();
    }
    pompa.opreste();
    blue.opreste();
  }
  else if(umiditate_sol>ud){
    Serial.println("Sol foarte umed.");
    Serial.println("Goleste apa din ghiveci.");
    //inca ma gandesc daca sa pun ventilatie sau nu
  }
  
  lux=s_lumina.CitesteLux();
  VerificaLumina(lux);

  temp=s_dht11.CitireTemperatura();
  if(temp>temp_max+threshold_temp)
  {
    green.porneste();
    Serial.println("Planta necesita ventilatie.");
    ventilator.porneste();
  }
  if(temp<=temp_max-threshold_temp)
  {
    green.opreste();
    Serial.println("Temperatura perfecta pentru planta!");
    ventilator.opreste();
  }
  






}
