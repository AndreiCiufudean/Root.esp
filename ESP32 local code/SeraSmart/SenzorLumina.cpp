#include "SenzorLumina.h"

SenzorLumina::SenzorLumina(int p)
{
  pin=p; //constructor pentru pin
}

void SenzorLumina::begin()
{
  pinMode(pin, INPUT); //trimite datele la esp32
}
 
float SenzorLumina::CitesteLux()
{
  float procent=(analogRead(pin), valmin, valmax, 0, 100);
  return constrain(procent, 0, 100); //citeste lumina
}