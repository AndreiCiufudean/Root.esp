#include "SenzorDHT11.h"
#include "SenzorLumina.h"
#include "SenzorUmiditateSol.h"
#include "Mosfet.h"
#include "LEDURI.h"
#include "Bluetooth.h"

#define PIN_DHT11 32  //GPIO32 I/O digitala
#define PIN_LUMINA 34  //GPIO34 intrare analogica
#define PIN_SOL 33  //GPIO33 intrare analogica

#define PIN_POMPA 19  //GPIO19 I/O digitala + generare semnal PWM
#define PIN_VENTILATOR 18  //GPIO18 I/O digitala + generare semnal PWM

#define LED_R 14 // iesire digitala/ PWM
#define LED_G 26 // iesire digitala/ PWM
#define LED_B 25 // iesire digitala/ PWM
#define LED_Y 27 // iesire digitala/ PWM

SenzorLumina s_lumina(PIN_LUMINA);
SenzorUmiditateSol s_umiditate_sol(PIN_SOL);
SenzorDHT11 s_dht11(PIN_DHT11, DHT11);
Mosfet pompa(PIN_POMPA);
Mosfet ventilator(PIN_VENTILATOR);
LEDURI red(LED_R);
LEDURI green(LED_G);
LEDURI blue(LED_B);
LEDURI yellow(LED_Y);

Bluetooth bt("SeraSmart");   // numele care apare la scanare pe telefon

// Test hardware (pompa, ventilator, LED-uri). NU il apelati in demo:
// are while(1) si blocheaza tot programul, inclusiv Bluetooth-ul.
void test(int DELAY)
{
  bool i=0;
  while(1)
  {
  if (i)
  {
    i=0;
    ventilator.opreste();
    delay(50);
    pompa.porneste();
  }
  else
  {
    i=1;
    pompa.opreste();
    delay(50);
    ventilator.porneste();
  }

  red.opreste();
  blue.porneste();
  delay(DELAY/4);
  
  blue.opreste();
  green.porneste();
  delay(DELAY/4);
  
  green.opreste();
  yellow.porneste();
  delay(DELAY/4);
  
  yellow.opreste();
  red.porneste();
  delay(DELAY/4);
  }
}

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

  bt.laComanda(laComanda);
  bt.laDeconectare(laDeconectare);
  bt.begin();
}

// ---- logica serei (nefolosita in demo, pastrata pentru mai tarziu) ----
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

// ---- POMPA controlata din telefon ----
// Comenzi: "P1" = porneste pompa, "P0" = opreste pompa
const unsigned long POMPA_TIMEOUT_MS = 5000;  // siguranta: pompa se opreste singura dupa 5 s
bool pompaPornita = false;
unsigned long pompaStart = 0;

void PornestePompa()
{
  pompa.porneste();
  blue.porneste();            // indicator vizual
  pompaPornita = true;
  pompaStart = millis();
  bt.trimite("POMPA:ON");
  Serial.println("Pompa pornita");
}

void OprestePompa()
{
  pompa.opreste();
  blue.opreste();
  pompaPornita = false;
  bt.trimite("POMPA:OFF");
  Serial.println("Pompa oprita");
}

void laComanda(String c)
{
  c.toUpperCase();
  if (c == "P1")      PornestePompa();
  else if (c == "P0") OprestePompa();
  else                bt.trimite("EROARE:" + c);
}

void laDeconectare()
{
  if (pompaPornita) OprestePompa();   // nu lasam pompa pornita daca pica conexiunea
}

// ---- DEMO ----
void loop() {
  bt.update();   // conectare/deconectare, "CONECTAT", comenzi primite

  if (bt.esteConectat())
    yellow.porneste();
  else
    yellow.opreste();

  if (pompaPornita && millis() - pompaStart >= POMPA_TIMEOUT_MS)
    OprestePompa();

  delay(20);
}
