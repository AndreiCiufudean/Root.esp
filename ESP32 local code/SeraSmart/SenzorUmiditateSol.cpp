#include "SenzorUmiditateSol.h"

SenzorUmiditateSol::SenzorUmiditateSol(int p)
{
  pin=p;
}

void SenzorUmiditateSol::begin()
{
  pinMode(pin, INPUT);
}

int SenzorUmiditateSol::CitireUmiditateSol()
{
  int procent=map(analogRead(pin), umed, uscat, 0, 100); //transforma valoarea analogica in procent
  return constrain(procent, 0, 100); //constrange intervalul procentului
}